#!/usr/bin/env python3
"""
NomadShift Backend API Test Suite
Tests all backend endpoints for the NomadShift gig marketplace app
"""

import requests
import json
import time
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://quickjobs-18.preview.emergentagent.com/api"
TIMEOUT = 30

class NomadShiftAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.test_user_id = None
        self.session_token = None
        self.test_job_id = None
        self.results = []
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    def test_health_check(self):
        """Test GET /api/ - Health check"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "NomadShift" in data["message"]:
                    self.log_result("Health Check", True, f"API responding: {data['message']}", data)
                else:
                    self.log_result("Health Check", False, f"Unexpected response format: {data}")
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
    
    def test_categories(self):
        """Test GET /api/categories"""
        try:
            response = self.session.get(f"{BASE_URL}/categories")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    categories = [cat.get("name", "Unknown") for cat in data[:3]]
                    self.log_result("Get Categories", True, f"Found {len(data)} categories: {', '.join(categories)}", data)
                else:
                    self.log_result("Get Categories", False, f"Empty or invalid categories list: {data}")
            else:
                self.log_result("Get Categories", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Get Categories", False, f"Exception: {str(e)}")
    
    def test_skills(self):
        """Test GET /api/skills"""
        try:
            response = self.session.get(f"{BASE_URL}/skills")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    skills = data[:3]
                    self.log_result("Get Skills", True, f"Found {len(data)} skills: {', '.join(skills)}", data)
                else:
                    self.log_result("Get Skills", False, f"Empty or invalid skills list: {data}")
            else:
                self.log_result("Get Skills", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Get Skills", False, f"Exception: {str(e)}")
    
    def test_jobs_empty(self):
        """Test GET /api/jobs - Should be empty initially"""
        try:
            response = self.session.get(f"{BASE_URL}/jobs")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Jobs (Empty)", True, f"Found {len(data)} jobs (expected empty initially)", data)
                else:
                    self.log_result("Get Jobs (Empty)", False, f"Invalid response format: {data}")
            else:
                self.log_result("Get Jobs (Empty)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Get Jobs (Empty)", False, f"Exception: {str(e)}")
    
    def create_test_user_in_db(self):
        """Create test user and session directly in MongoDB"""
        try:
            import pymongo
            from datetime import datetime, timezone, timedelta
            
            # Connect to MongoDB
            client = pymongo.MongoClient("mongodb://localhost:27017")
            db = client["test_database"]
            
            # Generate test data
            timestamp = int(time.time())
            self.test_user_id = f"user_{timestamp}"
            self.session_token = f"test_session_{timestamp}"
            
            # Create user
            user_data = {
                "user_id": self.test_user_id,
                "email": f"test.user.{timestamp}@example.com",
                "name": "María González",
                "picture": "https://via.placeholder.com/150",
                "role": None,
                "onboarding_completed": False,
                "created_at": datetime.now(timezone.utc)
            }
            db.users.insert_one(user_data)
            
            # Create session
            session_data = {
                "user_id": self.test_user_id,
                "session_token": self.session_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc)
            }
            db.user_sessions.insert_one(session_data)
            
            self.log_result("Create Test User", True, f"Created user {self.test_user_id} with session {self.session_token}")
            return True
            
        except Exception as e:
            self.log_result("Create Test User", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_me(self):
        """Test GET /api/auth/me with session token"""
        if not self.session_token:
            self.log_result("Auth Me", False, "No session token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = self.session.get(f"{BASE_URL}/auth/me", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data and data["user"].get("user_id") == self.test_user_id:
                    self.log_result("Auth Me", True, f"Authenticated as {data['user']['name']}", data)
                else:
                    self.log_result("Auth Me", False, f"Unexpected user data: {data}")
            else:
                self.log_result("Auth Me", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Auth Me", False, f"Exception: {str(e)}")
    
    def test_set_role(self):
        """Test POST /api/user/set-role"""
        if not self.session_token:
            self.log_result("Set Role", False, "No session token available")
            return
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {"role": "worker"}
            response = self.session.post(f"{BASE_URL}/user/set-role", headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "worker":
                    self.log_result("Set Role", True, f"Role set to worker: {data['message']}", data)
                else:
                    self.log_result("Set Role", False, f"Unexpected response: {data}")
            else:
                self.log_result("Set Role", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Set Role", False, f"Exception: {str(e)}")
    
    def test_worker_onboarding(self):
        """Test POST /api/onboarding/worker"""
        if not self.session_token:
            self.log_result("Worker Onboarding", False, "No session token available")
            return
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "name": "María González",
                "age": 28,
                "bio": "Trabajadora experimentada en servicio al cliente con 5 años de experiencia",
                "skills": ["Atención al cliente", "Barista", "Inglés"],
                "location": {"lat": -34.6037, "lng": -58.3816},
                "address": "Buenos Aires, Argentina"
            }
            response = self.session.post(f"{BASE_URL}/onboarding/worker", headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "profile" in data and data["profile"].get("role") == "worker":
                    self.log_result("Worker Onboarding", True, f"Onboarding completed: {data['message']}", data)
                else:
                    self.log_result("Worker Onboarding", False, f"Unexpected response: {data}")
            else:
                self.log_result("Worker Onboarding", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Worker Onboarding", False, f"Exception: {str(e)}")
    
    def test_ai_improve_description(self):
        """Test POST /api/ai/improve-description"""
        if not self.session_token:
            self.log_result("AI Improve Description", False, "No session token available")
            return
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "description": "Soy trabajador con experiencia en servicio al cliente",
                "context": "profile"
            }
            response = self.session.post(f"{BASE_URL}/ai/improve-description", headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "improved" in data and len(data["improved"]) > len(data.get("original", "")):
                    self.log_result("AI Improve Description", True, f"Description improved from {len(data.get('original', ''))} to {len(data['improved'])} chars", data)
                else:
                    self.log_result("AI Improve Description", False, f"AI improvement failed or no improvement: {data}")
            else:
                self.log_result("AI Improve Description", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("AI Improve Description", False, f"Exception: {str(e)}")
    
    def create_business_user(self):
        """Create a business user for job posting tests"""
        try:
            import pymongo
            from datetime import datetime, timezone, timedelta
            
            # Connect to MongoDB
            client = pymongo.MongoClient("mongodb://localhost:27017")
            db = client["test_database"]
            
            # Generate business user data
            timestamp = int(time.time())
            business_user_id = f"business_{timestamp}"
            business_session_token = f"business_session_{timestamp}"
            
            # Create business user
            user_data = {
                "user_id": business_user_id,
                "email": f"business.{timestamp}@example.com",
                "name": "Café Central",
                "picture": "https://via.placeholder.com/150",
                "role": "business",
                "onboarding_completed": True,
                "created_at": datetime.now(timezone.utc)
            }
            db.users.insert_one(user_data)
            
            # Create business profile
            profile_data = {
                "user_id": business_user_id,
                "role": "business",
                "name": "Café Central",
                "business_name": "Café Central Buenos Aires",
                "bio": "Café tradicional en el centro de Buenos Aires",
                "location": {"lat": -34.6037, "lng": -58.3816},
                "address": "Av. Corrientes 1234, Buenos Aires",
                "skills": ["food_service", "customer_service"],
                "rating": 0.0,
                "rating_count": 0,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            db.profiles.insert_one(profile_data)
            
            # Create session
            session_data = {
                "user_id": business_user_id,
                "session_token": business_session_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                "created_at": datetime.now(timezone.utc)
            }
            db.user_sessions.insert_one(session_data)
            
            self.business_session_token = business_session_token
            self.log_result("Create Business User", True, f"Created business user {business_user_id}")
            return True
            
        except Exception as e:
            self.log_result("Create Business User", False, f"Exception: {str(e)}")
            return False
    
    def test_create_job(self):
        """Test POST /api/jobs - Create a test job"""
        if not hasattr(self, 'business_session_token') or not self.business_session_token:
            if not self.create_business_user():
                return
                
        try:
            headers = {
                "Authorization": f"Bearer {self.business_session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "title": "Barista para turno mañana",
                "description": "Buscamos barista con experiencia para turno de mañana en café céntrico",
                "category": "food_service",
                "skills_required": ["Barista", "Atención al cliente"],
                "hourly_rate": 2500.0,
                "duration_hours": 8.0,
                "location": {"lat": -34.6037, "lng": -58.3816},
                "address": "Av. Corrientes 1234, Buenos Aires"
            }
            response = self.session.post(f"{BASE_URL}/jobs", headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "job_id" in data and data.get("title") == payload["title"]:
                    self.test_job_id = data["job_id"]
                    self.log_result("Create Job", True, f"Job created: {data['title']} (ID: {data['job_id']})", data)
                else:
                    self.log_result("Create Job", False, f"Unexpected response: {data}")
            else:
                self.log_result("Create Job", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Create Job", False, f"Exception: {str(e)}")
    
    def test_jobs_with_data(self):
        """Test GET /api/jobs - Should now have jobs"""
        try:
            response = self.session.get(f"{BASE_URL}/jobs")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    job_titles = [job.get("title", "Unknown") for job in data[:3]]
                    self.log_result("Get Jobs (With Data)", True, f"Found {len(data)} jobs: {', '.join(job_titles)}", data)
                else:
                    self.log_result("Get Jobs (With Data)", False, f"No jobs found after creation: {data}")
            else:
                self.log_result("Get Jobs (With Data)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Get Jobs (With Data)", False, f"Exception: {str(e)}")
    
    def test_job_application(self):
        """Test POST /api/jobs/{job_id}/apply"""
        if not self.session_token or not self.test_job_id:
            self.log_result("Job Application", False, "Missing session token or job ID")
            return
            
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "message": "Tengo 3 años de experiencia como barista y excelente atención al cliente"
            }
            response = self.session.post(f"{BASE_URL}/jobs/{self.test_job_id}/apply", headers=headers, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "application_id" in data and data.get("job_id") == self.test_job_id:
                    self.log_result("Job Application", True, f"Applied to job successfully (ID: {data['application_id']})", data)
                else:
                    self.log_result("Job Application", False, f"Unexpected response: {data}")
            else:
                self.log_result("Job Application", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Job Application", False, f"Exception: {str(e)}")
    
    def test_chat_rooms(self):
        """Test GET /api/chats"""
        if not self.session_token:
            self.log_result("Get Chat Rooms", False, "No session token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = self.session.get(f"{BASE_URL}/chats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Chat Rooms", True, f"Found {len(data)} chat rooms", data)
                else:
                    self.log_result("Get Chat Rooms", False, f"Invalid response format: {data}")
            else:
                self.log_result("Get Chat Rooms", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_result("Get Chat Rooms", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting NomadShift Backend API Tests")
        print("=" * 50)
        
        # Basic endpoints (no auth required)
        self.test_health_check()
        self.test_categories()
        self.test_skills()
        self.test_jobs_empty()
        
        # Create test user for auth-protected endpoints
        if self.create_test_user_in_db():
            # Auth-protected endpoints
            self.test_auth_me()
            self.test_set_role()
            self.test_worker_onboarding()
            self.test_ai_improve_description()
            
            # Job creation and application
            self.test_create_job()
            self.test_jobs_with_data()
            self.test_job_application()
            
            # Chat system
            self.test_chat_rooms()
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for r in self.results if r["success"])
        failed = len(self.results) - passed
        
        print(f"Total Tests: {len(self.results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.results)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        return self.results

if __name__ == "__main__":
    tester = NomadShiftAPITester()
    results = tester.run_all_tests()