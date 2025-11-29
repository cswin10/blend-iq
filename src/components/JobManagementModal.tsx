import React, { useState } from 'react';
import { X, Briefcase, Calendar, User } from 'lucide-react';
import { Job } from '../types';
import { createJob } from '../utils/jobStorage';

interface JobManagementModalProps {
  onClose: () => void;
  onCreateJob: (job: Job) => void;
}

export default function JobManagementModal({ onClose, onCreateJob }: JobManagementModalProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [jobCode, setJobCode] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Today's date
  const [initials, setInitials] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: string[] = [];

    if (!jobTitle.trim()) {
      newErrors.push('Job title is required');
    }

    if (!jobCode.trim()) {
      newErrors.push('Job code is required');
    }

    if (!date) {
      newErrors.push('Date is required');
    }

    if (!initials.trim()) {
      newErrors.push('Initials are required');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create new job
    const job = createJob(jobTitle.trim(), jobCode.trim(), date, initials.trim().toUpperCase());
    onCreateJob(job);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-navy-600" />
              <h2 className="text-2xl font-bold text-navy-700">Start New Job</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Enter job details to create a new blend optimization project
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Residential Development Site A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>

            {/* Job Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Code / Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={jobCode}
                onChange={(e) => setJobCode(e.target.value)}
                placeholder="e.g., JOB2024-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              />
            </div>

            {/* Initials */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Your Initials <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                placeholder="e.g., JD"
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 uppercase"
              />
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ul className="list-disc list-inside text-sm text-red-700">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary px-6 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn btn-primary px-6 py-2"
          >
            Start Job
          </button>
        </div>
      </div>
    </div>
  );
}
