from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from jobs_router import router as jobs_router

app = FastAPI(
    title="FastAPI Backend",
    version="1.0.0",
    description="FastAPI Backend Template"
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include job creation and event streaming routes
app.include_router(jobs_router)

@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI Backend"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 