import { Job, JobMetadata } from '../types';

const JOBS_STORAGE_KEY = 'blendiq_jobs';
const CURRENT_JOB_KEY = 'blendiq_current_job';

/**
 * Get all jobs from localStorage
 */
export function getAllJobs(): Job[] {
  try {
    const jobsJson = localStorage.getItem(JOBS_STORAGE_KEY);
    if (!jobsJson) return [];
    return JSON.parse(jobsJson);
  } catch (error) {
    console.error('Error loading jobs:', error);
    return [];
  }
}

/**
 * Get job metadata (without full material data) for listing
 */
export function getJobMetadata(): JobMetadata[] {
  const jobs = getAllJobs();
  return jobs.map(job => ({
    id: job.id,
    jobTitle: job.jobTitle,
    jobCode: job.jobCode,
    date: job.date,
    initials: job.initials,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    materialCount: job.materials.length,
  }));
}

/**
 * Get a specific job by ID
 */
export function getJob(jobId: string): Job | null {
  const jobs = getAllJobs();
  return jobs.find(job => job.id === jobId) || null;
}

/**
 * Save or update a job
 */
export function saveJob(job: Job): void {
  try {
    const jobs = getAllJobs();
    const existingIndex = jobs.findIndex(j => j.id === job.id);

    const updatedJob = {
      ...job,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      jobs[existingIndex] = updatedJob;
    } else {
      jobs.push(updatedJob);
    }

    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
  } catch (error) {
    console.error('Error saving job:', error);
    throw new Error('Failed to save job. Storage may be full.');
  }
}

/**
 * Delete a job by ID
 */
export function deleteJob(jobId: string): void {
  try {
    const jobs = getAllJobs();
    const filtered = jobs.filter(job => job.id !== jobId);
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(filtered));

    // Clear current job if it's the one being deleted
    const currentJobId = getCurrentJobId();
    if (currentJobId === jobId) {
      clearCurrentJob();
    }
  } catch (error) {
    console.error('Error deleting job:', error);
    throw new Error('Failed to delete job.');
  }
}

/**
 * Set the current active job
 */
export function setCurrentJob(jobId: string): void {
  localStorage.setItem(CURRENT_JOB_KEY, jobId);
}

/**
 * Get the current active job ID
 */
export function getCurrentJobId(): string | null {
  return localStorage.getItem(CURRENT_JOB_KEY);
}

/**
 * Get the current active job
 */
export function getCurrentJob(): Job | null {
  const jobId = getCurrentJobId();
  if (!jobId) return null;
  return getJob(jobId);
}

/**
 * Clear the current job
 */
export function clearCurrentJob(): void {
  localStorage.removeItem(CURRENT_JOB_KEY);
}

/**
 * Create a new job
 */
export function createJob(jobTitle: string, jobCode: string, date: string, initials: string): Job {
  const now = new Date().toISOString();
  return {
    id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    jobTitle,
    jobCode,
    date,
    initials,
    createdAt: now,
    updatedAt: now,
    materials: [],
  };
}

/**
 * Export job to JSON file
 */
export function exportJobToFile(job: Job): void {
  const dataStr = JSON.stringify(job, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${job.jobCode}_${job.jobTitle.replace(/\s+/g, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import job from JSON file
 */
export async function importJobFromFile(file: File): Promise<Job> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const job = JSON.parse(e.target?.result as string) as Job;
        // Validate job structure
        if (!job.id || !job.jobTitle || !job.jobCode) {
          throw new Error('Invalid job file format');
        }
        resolve(job);
      } catch (error) {
        reject(new Error('Failed to parse job file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
