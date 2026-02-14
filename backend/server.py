from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import base64
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Z.ai API configuration
ZAI_API_KEY = os.environ.get('ZAI_API_KEY', '6422740a283342afa95ded10fbb5ea.njMvimW35vveFkyT')
ZAI_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions'

# Create the main app
app = FastAPI(title="NomadShift API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Optional[str] = None  # 'worker' or 'business'
    onboarding_completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProfile(BaseModel):
    user_id: str
    role: str  # 'worker' or 'business'
    name: str
    age: Optional[int] = None
    bio: Optional[str] = None
    photo: Optional[str] = None  # base64
    skills: List[str] = []
    location: Optional[Dict[str, float]] = None  # {lat, lng}
    address: Optional[str] = None
    # Business specific
    business_name: Optional[str] = None
    business_photos: List[str] = []  # base64 images
    # Worker specific
    prestige_score: int = 0
    badges: List[str] = []
    completed_jobs: int = 0
    rating: float = 0.0
    rating_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Job(BaseModel):
    job_id: str = Field(default_factory=lambda: f"job_{uuid.uuid4().hex[:12]}")
    business_user_id: str
    business_name: str
    title: str
    description: str
    category: str
    skills_required: List[str] = []
    hourly_rate: float
    duration_hours: float
    location: Dict[str, float]  # {lat, lng}
    address: str
    status: str = "open"  # open, in_progress, completed, cancelled
    assigned_worker_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class JobApplication(BaseModel):
    application_id: str = Field(default_factory=lambda: f"app_{uuid.uuid4().hex[:12]}")
    job_id: str
    worker_user_id: str
    message: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected
    match_score: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Review(BaseModel):
    review_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    job_id: str
    reviewer_user_id: str
    reviewed_user_id: str
    rating: int  # 1-5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    chat_room_id: str
    sender_user_id: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    read: bool = False

class ChatRoom(BaseModel):
    room_id: str = Field(default_factory=lambda: f"room_{uuid.uuid4().hex[:12]}")
    participants: List[str]  # user_ids
    job_id: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionData(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== REQUEST/RESPONSE MODELS ====================

class SetRoleRequest(BaseModel):
    role: str  # 'worker' or 'business'

class OnboardingWorkerRequest(BaseModel):
    name: str
    age: Optional[int] = None
    bio: Optional[str] = None
    photo: Optional[str] = None
    skills: List[str] = []
    location: Optional[Dict[str, float]] = None
    address: Optional[str] = None

class OnboardingBusinessRequest(BaseModel):
    name: str
    bio: Optional[str] = None
    photo: Optional[str] = None
    business_name: str
    business_photos: List[str] = []
    location: Optional[Dict[str, float]] = None
    address: Optional[str] = None
    skills: List[str] = []  # Categories they hire for

class ImproveDescriptionRequest(BaseModel):
    description: str
    context: Optional[str] = "profile"  # 'profile' or 'job'

class CreateJobRequest(BaseModel):
    title: str
    description: str
    category: str
    skills_required: List[str] = []
    hourly_rate: float
    duration_hours: float
    location: Dict[str, float]
    address: str

class ApplyJobRequest(BaseModel):
    message: Optional[str] = None

class CreateReviewRequest(BaseModel):
    rating: int
    comment: Optional[str] = None

class SendMessageRequest(BaseModel):
    content: str

# ==================== AUTH HELPERS ====================

async def get_session_token(request: Request, authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Extract session token from cookie or header"""
    # First try cookie
    token = request.cookies.get("session_token")
    if token:
        return token
    # Then try Authorization header
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:]
    return None

async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> Optional[User]:
    """Get current user from session token"""
    token = await get_session_token(request, authorization)
    if not token:
        return None
    
    # Find session
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry with timezone awareness
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request, authorization: Optional[str] = Header(None)) -> User:
    """Require authentication - raises 401 if not authenticated"""
    user = await get_current_user(request, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange with Emergent Auth
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            user_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=500, detail="Authentication failed")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "role": None,
            "onboarding_completed": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = user_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Delete old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Store new session
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    # Get full user data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "user": user_doc,
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(require_auth)):
    """Get current user info"""
    # Also get profile if exists
    profile = await db.profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return {
        "user": current_user.model_dump(),
        "profile": profile
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    token = await get_session_token(request)
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== ROLE & ONBOARDING ENDPOINTS ====================

@api_router.post("/user/set-role")
async def set_user_role(data: SetRoleRequest, current_user: User = Depends(require_auth)):
    """Set user role (worker or business)"""
    if data.role not in ["worker", "business"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"role": data.role}}
    )
    
    return {"message": "Role set successfully", "role": data.role}

@api_router.post("/onboarding/worker")
async def complete_worker_onboarding(data: OnboardingWorkerRequest, current_user: User = Depends(require_auth)):
    """Complete worker onboarding"""
    profile_data = {
        "user_id": current_user.user_id,
        "role": "worker",
        "name": data.name,
        "age": data.age,
        "bio": data.bio,
        "photo": data.photo,
        "skills": data.skills,
        "location": data.location,
        "address": data.address,
        "prestige_score": 0,
        "badges": ["newcomer"],
        "completed_jobs": 0,
        "rating": 0.0,
        "rating_count": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Upsert profile
    await db.profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": profile_data},
        upsert=True
    )
    
    # Update user
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"onboarding_completed": True, "role": "worker"}}
    )
    
    return {"message": "Onboarding completed", "profile": profile_data}

@api_router.post("/onboarding/business")
async def complete_business_onboarding(data: OnboardingBusinessRequest, current_user: User = Depends(require_auth)):
    """Complete business onboarding"""
    profile_data = {
        "user_id": current_user.user_id,
        "role": "business",
        "name": data.name,
        "bio": data.bio,
        "photo": data.photo,
        "business_name": data.business_name,
        "business_photos": data.business_photos,
        "location": data.location,
        "address": data.address,
        "skills": data.skills,  # Categories they hire for
        "rating": 0.0,
        "rating_count": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Upsert profile
    await db.profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": profile_data},
        upsert=True
    )
    
    # Update user
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {"onboarding_completed": True, "role": "business"}}
    )
    
    return {"message": "Onboarding completed", "profile": profile_data}

@api_router.get("/profile")
async def get_profile(current_user: User = Depends(require_auth)):
    """Get current user's profile"""
    profile = await db.profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@api_router.get("/profile/{user_id}")
async def get_user_profile(user_id: str):
    """Get a user's profile by ID"""
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

# ==================== AI ENDPOINTS ====================

@api_router.post("/ai/improve-description")
async def improve_description(data: ImproveDescriptionRequest, current_user: User = Depends(require_auth)):
    """Use Z.ai GLM to improve profile/job description"""
    
    if data.context == "profile":
        system_prompt = """You are an expert copywriter for a gig-work marketplace called NomadShift. 
Improve this profile description to be attractive, professional, and concise. 
Make it engaging and highlight the person's strengths. 
Keep it under 150 words. Write in Spanish if the input is in Spanish, otherwise in English.
Only return the improved description, no explanations."""
    else:
        system_prompt = """You are an expert copywriter for a gig-work marketplace called NomadShift. 
Improve this job description to be clear, professional, and attractive to potential workers. 
Highlight key requirements and benefits. 
Keep it under 200 words. Write in Spanish if the input is in Spanish, otherwise in English.
Only return the improved description, no explanations."""
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                ZAI_API_URL,
                headers={
                    "Authorization": f"Bearer {ZAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "glm-4.5",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": data.description}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 500
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Z.ai API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="AI service unavailable")
            
            result = response.json()
            improved_text = result["choices"][0]["message"]["content"]
            
            return {
                "original": data.description,
                "improved": improved_text.strip()
            }
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except Exception as e:
        logger.error(f"AI improvement error: {e}")
        raise HTTPException(status_code=500, detail="Failed to improve description")

# ==================== JOB ENDPOINTS ====================

@api_router.post("/jobs")
async def create_job(data: CreateJobRequest, current_user: User = Depends(require_auth)):
    """Create a new job posting (business only)"""
    # Get profile to verify business role
    profile = await db.profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not profile or profile.get("role") != "business":
        raise HTTPException(status_code=403, detail="Only businesses can post jobs")
    
    job = Job(
        business_user_id=current_user.user_id,
        business_name=profile.get("business_name", profile.get("name", "")),
        title=data.title,
        description=data.description,
        category=data.category,
        skills_required=data.skills_required,
        hourly_rate=data.hourly_rate,
        duration_hours=data.duration_hours,
        location=data.location,
        address=data.address
    )
    
    await db.jobs.insert_one(job.model_dump())
    return job.model_dump()

@api_router.get("/jobs")
async def get_jobs(
    category: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 10.0,
    status: str = "open"
):
    """Get all jobs with optional filters"""
    query = {"status": status}
    
    if category:
        query["category"] = category
    
    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # If location provided, filter by distance
    if lat is not None and lng is not None:
        filtered_jobs = []
        for job in jobs:
            if job.get("location"):
                job_lat = job["location"].get("lat", 0)
                job_lng = job["location"].get("lng", 0)
                # Simple distance calculation (Haversine approximation)
                distance = ((job_lat - lat)**2 + (job_lng - lng)**2) ** 0.5 * 111  # km
                if distance <= radius_km:
                    job["distance_km"] = round(distance, 2)
                    filtered_jobs.append(job)
        jobs = sorted(filtered_jobs, key=lambda x: x.get("distance_km", 999))
    
    return jobs

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Get job details"""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@api_router.post("/jobs/{job_id}/apply")
async def apply_to_job(job_id: str, data: ApplyJobRequest, current_user: User = Depends(require_auth)):
    """Apply to a job (worker only)"""
    # Verify worker role
    profile = await db.profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not profile or profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can apply to jobs")
    
    # Check job exists and is open
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "open":
        raise HTTPException(status_code=400, detail="Job is no longer accepting applications")
    
    # Check if already applied
    existing = await db.applications.find_one({
        "job_id": job_id,
        "worker_user_id": current_user.user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    
    # Calculate match score based on skills
    worker_skills = set(profile.get("skills", []))
    required_skills = set(job.get("skills_required", []))
    if required_skills:
        match_score = len(worker_skills & required_skills) / len(required_skills) * 100
    else:
        match_score = 50.0  # Default score if no skills required
    
    # Add prestige bonus
    prestige = profile.get("prestige_score", 0)
    match_score += min(prestige / 10, 20)  # Max 20 bonus points from prestige
    
    application = JobApplication(
        job_id=job_id,
        worker_user_id=current_user.user_id,
        message=data.message,
        match_score=min(match_score, 100)
    )
    
    await db.applications.insert_one(application.model_dump())
    return application.model_dump()

@api_router.get("/jobs/{job_id}/applications")
async def get_job_applications(job_id: str, current_user: User = Depends(require_auth)):
    """Get applications for a job (business owner only)"""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["business_user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    applications = await db.applications.find({"job_id": job_id}, {"_id": 0}).to_list(100)
    
    # Enrich with worker profiles
    for app in applications:
        profile = await db.profiles.find_one({"user_id": app["worker_user_id"]}, {"_id": 0})
        app["worker_profile"] = profile
    
    # Sort by match score
    applications.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    
    return applications

@api_router.post("/jobs/{job_id}/accept/{application_id}")
async def accept_application(job_id: str, application_id: str, current_user: User = Depends(require_auth)):
    """Accept an application and assign worker to job"""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["business_user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    application = await db.applications.find_one({"application_id": application_id}, {"_id": 0})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update application status
    await db.applications.update_one(
        {"application_id": application_id},
        {"$set": {"status": "accepted"}}
    )
    
    # Update job
    await db.jobs.update_one(
        {"job_id": job_id},
        {"$set": {
            "status": "in_progress",
            "assigned_worker_id": application["worker_user_id"],
            "start_time": datetime.now(timezone.utc)
        }}
    )
    
    # Reject other applications
    await db.applications.update_many(
        {"job_id": job_id, "application_id": {"$ne": application_id}},
        {"$set": {"status": "rejected"}}
    )
    
    # Create chat room
    chat_room = ChatRoom(
        participants=[current_user.user_id, application["worker_user_id"]],
        job_id=job_id
    )
    await db.chat_rooms.insert_one(chat_room.model_dump())
    
    return {"message": "Application accepted", "chat_room_id": chat_room.room_id}

@api_router.post("/jobs/{job_id}/complete")
async def complete_job(job_id: str, current_user: User = Depends(require_auth)):
    """Mark job as completed"""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["business_user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if job["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Job is not in progress")
    
    await db.jobs.update_one(
        {"job_id": job_id},
        {"$set": {
            "status": "completed",
            "end_time": datetime.now(timezone.utc)
        }}
    )
    
    # Update worker stats
    if job.get("assigned_worker_id"):
        await db.profiles.update_one(
            {"user_id": job["assigned_worker_id"]},
            {
                "$inc": {"completed_jobs": 1, "prestige_score": 10},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    
    return {"message": "Job completed"}

@api_router.get("/my-jobs")
async def get_my_jobs(current_user: User = Depends(require_auth)):
    """Get jobs for current user (posted by business or assigned to worker)"""
    profile = await db.profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not profile:
        return []
    
    if profile.get("role") == "business":
        jobs = await db.jobs.find({"business_user_id": current_user.user_id}, {"_id": 0}).to_list(100)
    else:
        # Get jobs where worker has applied or is assigned
        applications = await db.applications.find({"worker_user_id": current_user.user_id}, {"_id": 0}).to_list(100)
        job_ids = [app["job_id"] for app in applications]
        jobs = await db.jobs.find({"job_id": {"$in": job_ids}}, {"_id": 0}).to_list(100)
        
        # Add application status to each job
        app_status = {app["job_id"]: app["status"] for app in applications}
        for job in jobs:
            job["application_status"] = app_status.get(job["job_id"])
    
    return jobs

# ==================== REVIEW ENDPOINTS ====================

@api_router.post("/jobs/{job_id}/review")
async def create_review(job_id: str, data: CreateReviewRequest, current_user: User = Depends(require_auth)):
    """Create a review for a completed job"""
    job = await db.jobs.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed jobs")
    
    # Determine who is being reviewed
    if current_user.user_id == job["business_user_id"]:
        reviewed_user_id = job["assigned_worker_id"]
    elif current_user.user_id == job.get("assigned_worker_id"):
        reviewed_user_id = job["business_user_id"]
    else:
        raise HTTPException(status_code=403, detail="Not authorized to review this job")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "job_id": job_id,
        "reviewer_user_id": current_user.user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed this job")
    
    review = Review(
        job_id=job_id,
        reviewer_user_id=current_user.user_id,
        reviewed_user_id=reviewed_user_id,
        rating=max(1, min(5, data.rating)),
        comment=data.comment
    )
    
    await db.reviews.insert_one(review.model_dump())
    
    # Update reviewed user's rating
    reviews = await db.reviews.find({"reviewed_user_id": reviewed_user_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    
    await db.profiles.update_one(
        {"user_id": reviewed_user_id},
        {"$set": {
            "rating": round(avg_rating, 2),
            "rating_count": len(reviews),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Award badge if worker reaches milestones
    profile = await db.profiles.find_one({"user_id": reviewed_user_id}, {"_id": 0})
    if profile and profile.get("role") == "worker":
        badges = profile.get("badges", [])
        rating_count = len(reviews)
        
        if rating_count >= 5 and "rising_star" not in badges:
            badges.append("rising_star")
        if rating_count >= 20 and "trusted" not in badges:
            badges.append("trusted")
        if avg_rating >= 4.5 and rating_count >= 10 and "top_rated" not in badges:
            badges.append("top_rated")
        
        await db.profiles.update_one(
            {"user_id": reviewed_user_id},
            {"$set": {"badges": badges}}
        )
    
    return review.model_dump()

@api_router.get("/reviews/{user_id}")
async def get_user_reviews(user_id: str):
    """Get reviews for a user"""
    reviews = await db.reviews.find({"reviewed_user_id": user_id}, {"_id": 0}).to_list(100)
    return reviews

# ==================== CHAT ENDPOINTS ====================

@api_router.get("/chats")
async def get_chat_rooms(current_user: User = Depends(require_auth)):
    """Get all chat rooms for current user"""
    rooms = await db.chat_rooms.find(
        {"participants": current_user.user_id},
        {"_id": 0}
    ).sort("last_message_time", -1).to_list(100)
    
    # Enrich with participant info
    for room in rooms:
        other_user_id = [p for p in room["participants"] if p != current_user.user_id][0]
        profile = await db.profiles.find_one({"user_id": other_user_id}, {"_id": 0})
        room["other_participant"] = profile
        
        # Get job info if exists
        if room.get("job_id"):
            job = await db.jobs.find_one({"job_id": room["job_id"]}, {"_id": 0})
            room["job"] = job
    
    return rooms

@api_router.get("/chats/{room_id}/messages")
async def get_chat_messages(room_id: str, current_user: User = Depends(require_auth)):
    """Get messages in a chat room"""
    room = await db.chat_rooms.find_one({"room_id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    if current_user.user_id not in room["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await db.chat_messages.find(
        {"chat_room_id": room_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Mark messages as read
    await db.chat_messages.update_many(
        {"chat_room_id": room_id, "sender_user_id": {"$ne": current_user.user_id}},
        {"$set": {"read": True}}
    )
    
    return messages

@api_router.post("/chats/{room_id}/messages")
async def send_message(room_id: str, data: SendMessageRequest, current_user: User = Depends(require_auth)):
    """Send a message in a chat room"""
    room = await db.chat_rooms.find_one({"room_id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    if current_user.user_id not in room["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    message = ChatMessage(
        chat_room_id=room_id,
        sender_user_id=current_user.user_id,
        content=data.content
    )
    
    await db.chat_messages.insert_one(message.model_dump())
    
    # Update room's last message
    await db.chat_rooms.update_one(
        {"room_id": room_id},
        {"$set": {
            "last_message": data.content[:100],
            "last_message_time": datetime.now(timezone.utc)
        }}
    )
    
    return message.model_dump()

# ==================== UTILITY ENDPOINTS ====================

@api_router.get("/categories")
async def get_categories():
    """Get available job categories"""
    return [
        {"id": "food_service", "name": "Servicio de Alimentos", "icon": "restaurant"},
        {"id": "retail", "name": "Retail / Ventas", "icon": "store"},
        {"id": "cleaning", "name": "Limpieza", "icon": "cleaning-services"},
        {"id": "delivery", "name": "Entregas", "icon": "delivery-dining"},
        {"id": "hospitality", "name": "Hospitalidad", "icon": "hotel"},
        {"id": "events", "name": "Eventos", "icon": "celebration"},
        {"id": "warehouse", "name": "Almacén", "icon": "warehouse"},
        {"id": "customer_service", "name": "Atención al Cliente", "icon": "support-agent"},
        {"id": "admin", "name": "Administrativo", "icon": "description"},
        {"id": "other", "name": "Otro", "icon": "more-horiz"}
    ]

@api_router.get("/skills")
async def get_skills():
    """Get available skills"""
    return [
        "Barista", "Cocina", "Atención al cliente", "Caja registradora",
        "Limpieza", "Organización", "Manejo de inventario", "Conducir",
        "Inglés", "Portugués", "Servicio de mesa", "Bartender",
        "Seguridad", "Recepción", "Computación básica", "Excel",
        "Redes sociales", "Fotografía", "Carga pesada", "Primeros auxilios"
    ]

@api_router.get("/")
async def root():
    return {"message": "NomadShift API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
