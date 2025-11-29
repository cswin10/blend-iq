import { useState, useEffect } from 'react';
import { X, Briefcase, Trash2, FolderOpen, Calendar, User, Download, Plus } from 'lucide-react';
import { JobMetadata } from '../types';
import { getJobMetadata, deleteJob, exportJobToFile, getJob } from '../utils/jobStorage';

interface JobListModalProps {
  onClose: () => void;
  onOpenJob: (jobId: string) => void;
  onCreateNew: () => void;
  currentJobId?: string;
}

export default function JobListModal({ onClose, onOpenJob, onCreateNew, currentJobId }: JobListModalProps) {
  const [jobs, setJobs] = useState<JobMetadata[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = () => {
    const jobList = getJobMetadata();
    // Sort by most recently updated first
    jobList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setJobs(jobList);
  };

  const handleDelete = (jobId: string) => {
    if (confirmDelete === jobId) {
      deleteJob(jobId);
      loadJobs();
      setConfirmDelete(null);

      // If deleting current job, create new one
      if (jobId === currentJobId) {
        onCreateNew();
      }
    } else {
      setConfirmDelete(jobId);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleExport = (jobId: string) => {
    const job = getJob(jobId);
    if (job) {
      exportJobToFile(job);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-navy-600" />
              <div>
                <h2 className="text-2xl font-bold text-navy-700">All Jobs</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {jobs.length} job{jobs.length !== 1 ? 's' : ''} saved
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Job List */}
        <div className="flex-1 overflow-y-auto p-6">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No jobs found</p>
              <button onClick={onCreateNew} className="btn btn-primary flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" />
                Create New Job
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isCurrentJob = job.id === currentJobId;
                const isConfirmingDelete = confirmDelete === job.id;

                return (
                  <div
                    key={job.id}
                    className={`
                      p-4 border-2 rounded-lg transition-all
                      ${isCurrentJob ? 'border-navy-500 bg-navy-50' : 'border-gray-200 hover:border-navy-300'}
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Job Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-navy-700 truncate">{job.jobTitle}</h3>
                          {isCurrentJob && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Code:</span>
                            <span>{job.jobCode}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(job.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{job.initials}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Materials:</span>
                            <span>{job.materialCount}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Updated: {formatDate(job.updatedAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!isCurrentJob && (
                          <button
                            onClick={() => onOpenJob(job.id)}
                            className="p-2 text-navy-600 hover:bg-navy-100 rounded-lg transition-colors"
                            title="Open job"
                          >
                            <FolderOpen className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleExport(job.id)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Export to JSON"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className={`
                            p-2 rounded-lg transition-colors
                            ${isConfirmingDelete
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'text-red-600 hover:bg-red-100'
                            }
                          `}
                          title={isConfirmingDelete ? 'Click again to confirm' : 'Delete job'}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {isConfirmingDelete && (
                      <p className="text-xs text-red-600 mt-2 font-medium">
                        Click delete again to confirm permanent deletion
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between gap-3">
          <button onClick={onCreateNew} className="btn btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Job
          </button>
          <button onClick={onClose} className="btn btn-primary px-6 py-2">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
