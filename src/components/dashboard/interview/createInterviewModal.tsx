import React, { useEffect, useState } from "react";
import LoaderWithLogo from "@/components/loaders/loader-with-logo/loaderWithLogo";
import DetailsPopup from "@/components/dashboard/interview/create-popup/details";
import CustomMetricsPopup from "@/components/dashboard/interview/create-popup/customMetrics";
import QuestionsPopup from "@/components/dashboard/interview/create-popup/questions";
import { InterviewBase } from "@/types/interview";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

type Step = "details" | "loading" | "metrics" | "questions";

const CreateEmptyInterviewData = (): InterviewBase => ({
  user_id: "",
  organization_id: "",
  name: "",
  interviewer_id: BigInt(0),
  objective: "",
  question_count: 0,
  time_duration: "",
  is_anonymous: false,
  questions: [],
  description: "",
  response_count: BigInt(0),
  logo_url: null,
});

function CreateInterviewModal({ open, setOpen }: Props) {
  const [step, setStep] = useState<Step>("details");
  const [interviewData, setInterviewData] = useState<InterviewBase>(
    CreateEmptyInterviewData(),
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Below for File Upload
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileName, setFileName] = useState("");

  // Handle loading state transition
  useEffect(() => {
    if (step === "loading") {
      // Short delay to show loader, then proceed to metrics
      const timer = setTimeout(() => {
        setStep("metrics");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => {
    if (!open) {
      setStep("details");
      setInterviewData(CreateEmptyInterviewData());
      setIsUploaded(false);
      setFileName("");
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoPreview(null);
      setLogoFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDetailsComplete = () => {
    setStep("loading");
  };

  const handleMetricsBack = () => {
    setStep("details");
  };

  const handleMetricsNext = () => {
    setStep("questions");
  };

  const handleQuestionsBack = () => {
    setStep("metrics");
  };

  return (
    <>
      {step === "loading" ? (
        <div className="w-[38rem] h-[35rem]">
          <LoaderWithLogo />
        </div>
      ) : step === "details" ? (
        <DetailsPopup
          open={open}
          setLoading={handleDetailsComplete}
          interviewData={interviewData}
          setInterviewData={setInterviewData}
          isUploaded={isUploaded}
          setIsUploaded={setIsUploaded}
          fileName={fileName}
          setFileName={setFileName}
          logoFile={logoFile}
          setLogoFile={setLogoFile}
          logoPreview={logoPreview}
          setLogoPreview={setLogoPreview}
        />
      ) : step === "metrics" ? (
        <CustomMetricsPopup
          interviewData={interviewData}
          setInterviewData={setInterviewData}
          onBack={handleMetricsBack}
          onNext={handleMetricsNext}
        />
      ) : (
        <QuestionsPopup
          interviewData={interviewData}
          logoFile={logoFile}
          setProceed={handleQuestionsBack}
          setOpen={setOpen}
        />
      )}
    </>
  );
}

export default CreateInterviewModal;
