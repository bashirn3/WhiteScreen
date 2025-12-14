"use client";

import { useInterviewers } from "@/contexts/interviewers.context";
import React from "react";
import InterviewerCard from "@/components/dashboard/interviewer/interviewerCard";
import CreateInterviewerButton from "@/components/dashboard/interviewer/createInterviewerButton";

function Interviewers() {
  const { interviewers, interviewersLoading } = useInterviewers();

  function InterviewersLoader() {
    return (
      <div className="grid grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="w-[200px] h-[200px] animate-pulse rounded-[20px] bg-gray-100"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <main className="p-6 animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Interviewers
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Get to know them by clicking the profile.
        </p>
      </div>

      {/* Interviewers Grid */}
      <div className="flex flex-col gap-10">
        {interviewersLoading ? (
          <InterviewersLoader />
        ) : (
          <>
            {interviewers.length === 0 ? (
              <CreateInterviewerButton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {interviewers.map((interviewer) => (
                  <InterviewerCard
                    key={interviewer.id}
                    interviewer={interviewer}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default Interviewers;
