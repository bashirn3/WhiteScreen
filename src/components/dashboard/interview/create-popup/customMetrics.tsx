"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { InterviewBase, CustomMetric } from "@/types/interview";
import { ChevronLeft, ChevronRight, Plus, Trash2, Scale, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface Props {
  interviewData: InterviewBase;
  setInterviewData: (data: InterviewBase) => void;
  onBack: () => void;
  onNext: () => void;
}

const DEFAULT_METRICS: CustomMetric[] = [
  {
    id: "technical_ability",
    title: "Technical Ability",
    description: "Evaluate technical knowledge, problem-solving skills, and domain expertise demonstrated during the interview.",
    weight: 5,
  },
  {
    id: "soft_skills",
    title: "Soft Skills",
    description: "Assess communication, teamwork, adaptability, and interpersonal skills shown in responses.",
    weight: 5,
  },
];

function CustomMetricsPopup({ interviewData, setInterviewData, onBack, onNext }: Props) {
  const [metrics, setMetrics] = useState<CustomMetric[]>(interviewData.custom_metrics || []);
  const [totalWeight, setTotalWeight] = useState(0);

  useEffect(() => {
    const total = metrics.reduce((sum, m) => sum + m.weight, 0);
    setTotalWeight(total);
  }, [metrics]);

  const handleAddMetric = () => {
    const newMetric: CustomMetric = {
      id: uuidv4(),
      title: "",
      description: "",
      weight: 1,
    };
    setMetrics([...metrics, newMetric]);
  };

  const handleRemoveMetric = (id: string) => {
    setMetrics(metrics.filter((m) => m.id !== id));
  };

  const handleMetricChange = (
    id: string,
    field: keyof CustomMetric,
    value: string | number
  ) => {
    setMetrics(metrics.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleUseDefaults = () => {
    setMetrics(DEFAULT_METRICS);
  };

  const autoBalanceWeights = () => {
    if (metrics.length === 0) return;
    
    const weightPerMetric = Math.floor(10 / metrics.length);
    const remainder = 10 - (weightPerMetric * metrics.length);
    
    setMetrics(metrics.map((m, index) => ({
      ...m,
      weight: weightPerMetric + (index === 0 ? remainder : 0),
    })));
  };

  const handleNext = () => {
    // Save metrics to interview data
    setInterviewData({
      ...interviewData,
      custom_metrics: metrics.length > 0 ? metrics : undefined,
    });
    onNext();
  };

  const handleSkip = () => {
    // Clear metrics and proceed
    setInterviewData({
      ...interviewData,
      custom_metrics: undefined,
    });
    onNext();
  };

  const isValid = metrics.length === 0 || (
    totalWeight === 10 &&
    metrics.every(m => m.title.trim() !== "" && m.description.trim() !== "")
  );

  return (
    <div className="w-[38rem] h-[35rem] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-xl font-semibold">Custom Evaluation Metrics</h1>
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="w-8 h-1 bg-indigo-600 rounded" />
        <div className="w-8 h-1 bg-indigo-600 rounded" />
        <div className="w-8 h-1 bg-gray-300 rounded" />
      </div>

      {/* Description */}
      <div className="px-6 py-2">
        <p className="text-sm text-gray-600 text-center">
          Define custom metrics to evaluate candidates. This step is optional - you can skip it to use standard evaluation.
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-6">
        {/* Weight indicator */}
        {metrics.length > 0 && (
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                totalWeight === 10
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <span className="font-medium">Total Weight:</span>
              <span className="font-bold">{totalWeight}/10</span>
              {totalWeight !== 10 && <AlertCircle className="h-4 w-4" />}
            </div>
            {totalWeight !== 10 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={autoBalanceWeights}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Auto-balance weights
              </Button>
            )}
          </div>
        )}

        {/* Metrics list */}
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div
              key={metric.id}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Metric Title *
                      </label>
                      <Input
                        value={metric.title}
                        onChange={(e) =>
                          handleMetricChange(metric.id, "title", e.target.value)
                        }
                        placeholder="e.g., Technical Ability"
                        className="text-sm"
                      />
                    </div>
                    <div className="w-28">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Weight
                      </label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[metric.weight]}
                          onValueChange={(value) =>
                            handleMetricChange(metric.id, "weight", value[0])
                          }
                          max={10}
                          min={1}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm font-bold text-indigo-600 w-5 text-center">
                          {metric.weight}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Description (What to evaluate) *
                    </label>
                    <Textarea
                      value={metric.description}
                      onChange={(e) =>
                        handleMetricChange(metric.id, "description", e.target.value)
                      }
                      placeholder="Describe what should be evaluated for this metric..."
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMetric(metric.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add metric / Use defaults buttons */}
        <div className="flex gap-3 mt-4 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddMetric}
            className="flex-1 border-dashed border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Metric
          </Button>
          {metrics.length === 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleUseDefaults}
              className="flex-1 border-indigo-300 text-indigo-600 hover:bg-indigo-50"
            >
              <Scale className="h-4 w-4 mr-2" />
              Use Default Metrics
            </Button>
          )}
        </div>

        {metrics.length === 0 && (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <Scale className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No custom metrics defined yet.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Standard evaluation criteria will be used if you skip this step.
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Footer buttons */}
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-gray-500"
        >
          Skip this step
        </Button>
        <div className="flex gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleNext}
                    disabled={!isValid}
                    className="bg-indigo-600 hover:bg-indigo-800"
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </span>
              </TooltipTrigger>
              {!isValid && (
                <TooltipContent className="bg-red-600 text-white">
                  <p>Please ensure all metrics have titles, descriptions, and weights sum to 10</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export default CustomMetricsPopup;

