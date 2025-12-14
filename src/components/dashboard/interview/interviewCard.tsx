"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, CopyCheck } from "lucide-react";
import { ResponseService } from "@/services/responses.service";
import axios from "axios";
import MiniLoader from "@/components/loaders/mini-loader/miniLoader";
import { InterviewerService } from "@/services/interviewers.service";
import { usePageTransition } from "@/components/PageTransition";

interface Props {
  name: string | null;
  interviewerId: bigint;
  id: string;
  url: string;
  readableSlug: string;
}

const base_url = process.env.NEXT_PUBLIC_LIVE_URL;

function InterviewCard({ name, interviewerId, id, url, readableSlug }: Props) {
  const [copied, setCopied] = useState(false);
  const [responseCount, setResponseCount] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [img, setImg] = useState("");
  const { navigateWithTransition } = usePageTransition();

  useEffect(() => {
    const fetchInterviewer = async () => {
      const interviewer =
        await InterviewerService.getInterviewer(interviewerId);
      setImg(interviewer.image);
    };
    fetchInterviewer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const responses = await ResponseService.getAllResponses(id);
        setResponseCount(responses.length);
        if (responses.length > 0) {
          setIsFetching(true);
          for (const response of responses) {
            if (!response.is_analysed) {
              try {
                const result = await axios.post("/api/get-call", {
                  id: response.call_id,
                });

                if (result.status !== 200) {
                  throw new Error(`HTTP error! status: ${result.status}`);
                }
              } catch (error) {
                console.error(
                  `Failed to call api/get-call for response id ${response.call_id}:`,
                  error,
                );
              }
            }
          }
          setIsFetching(false);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(
        readableSlug ? `${base_url}/call/${readableSlug}` : (url as string),
      )
      .then(
        () => {
          setCopied(true);
          toast.success(
            "The link to your interview has been copied to your clipboard.",
            {
              position: "bottom-right",
              duration: 3000,
            },
          );
          setTimeout(() => {
            setCopied(false);
          }, 2000);
        },
        (err) => {
          console.log("failed to copy", err.mesage);
        },
      );
  };

  return (
    <div
      onClick={() => {
        if (!isFetching) {
          navigateWithTransition(`/interviews/${id}`);
        }
      }}
      style={{
        pointerEvents: isFetching ? "none" : "auto",
        cursor: isFetching ? "default" : "pointer",
      }}
      className="w-[250px] min-w-[200px] max-w-[272px] h-[250px] bg-[#F9F9FA] rounded-[20px] shrink-0 overflow-hidden transition-all duration-300 ease-out hover:shadow-md"
    >
      <div className={`h-full flex flex-col ${isFetching ? "opacity-60" : ""}`}>
        {/* Title Area */}
        <div className="relative flex-1 flex items-center justify-center bg-indigo-50/70 m-3 mb-0 rounded-[16px]">
          <p className="mx-6 text-center text-sm font-semibold text-gray-900">
            {name}
            {isFetching && (
              <span className="block mt-1">
                <MiniLoader />
              </span>
            )}
          </p>

          {/* Copy Button */}
          <div className="absolute right-3 top-3">
            <Button
              className={`h-7 w-7 rounded-md p-0 ${
                copied 
                  ? "bg-indigo-600 text-white" 
                  : "bg-white/80 text-gray-600 hover:bg-white"
              }`}
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                copyToClipboard();
              }}
            >
              {copied ? <CopyCheck size={14} /> : <Copy size={14} />}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white shadow-sm">
              {img ? (
                <Image
                  src={img}
                  alt="Picture of the interviewer"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gray-200" />
              )}
            </div>
          </div>

          <div className="text-sm text-gray-700">
            Responses:{" "}
            <span className="font-semibold text-gray-900">
              {responseCount?.toString() || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewCard;
