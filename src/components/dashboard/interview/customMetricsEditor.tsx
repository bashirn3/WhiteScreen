"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { CustomMetric } from "@/types/interview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Info, AlertCircle, Scale } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";

interface CustomMetricsEditorProps {
  metrics: CustomMetric[];
  onChange: (metrics: CustomMetric[]) => void;
  disabled?: boolean;
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

function CustomMetricsEditor({
  metrics,
  onChange,
  disabled = false,
}: CustomMetricsEditorProps) {
  const [localMetrics, setLocalMetrics] = useState<CustomMetric[]>(metrics);
  const [totalWeight, setTotalWeight] = useState(0);
  const [showWeightWarning, setShowWeightWarning] = useState(false);

  useEffect(() => {
    setLocalMetrics(metrics);
  }, [metrics]);

  useEffect(() => {
    const total = localMetrics.reduce((sum, m) => sum + m.weight, 0);
    setTotalWeight(total);
    setShowWeightWarning(localMetrics.length > 0 && total !== 10);
  }, [localMetrics]);

  const handleAddMetric = () => {
    const newMetric: CustomMetric = {
      id: uuidv4(),
      title: "",
      description: "",
      weight: 1,
    };
    const updatedMetrics = [...localMetrics, newMetric];
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  const handleRemoveMetric = (id: string) => {
    const updatedMetrics = localMetrics.filter((m) => m.id !== id);
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  const handleMetricChange = (
    id: string,
    field: keyof CustomMetric,
    value: string | number
  ) => {
    const updatedMetrics = localMetrics.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  const handleUseDefaults = () => {
    setLocalMetrics(DEFAULT_METRICS);
    onChange(DEFAULT_METRICS);
  };

  const autoBalanceWeights = () => {
    if (localMetrics.length === 0) return;
    
    const weightPerMetric = Math.floor(10 / localMetrics.length);
    const remainder = 10 - (weightPerMetric * localMetrics.length);
    
    const updatedMetrics = localMetrics.map((m, index) => ({
      ...m,
      weight: weightPerMetric + (index === 0 ? remainder : 0),
    }));
    
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold">Custom Evaluation Metrics</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-700 text-white p-3">
                <p className="text-sm">
                  Define custom metrics to evaluate candidates. Each metric has a
                  weight that determines its importance in the overall score.
                  Weights should add up to 10.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {localMetrics.length === 0 && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseDefaults}
            className="text-xs"
          >
            Use Default Metrics
          </Button>
        )}
      </div>

      {localMetrics.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              totalWeight === 10
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <span className="font-medium">Total Weight:</span>
            <span className="font-bold">{totalWeight}/10</span>
            {totalWeight !== 10 && (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>
          {showWeightWarning && !disabled && (
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

      <div className="space-y-3">
        {localMetrics.map((metric, index) => (
          <div
            key={metric.id}
            className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Metric Title
                    </label>
                    <Input
                      value={metric.title}
                      onChange={(e) =>
                        handleMetricChange(metric.id, "title", e.target.value)
                      }
                      placeholder="e.g., Technical Ability"
                      disabled={disabled}
                      className="text-sm"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Weight (0-10)
                    </label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[metric.weight]}
                        onValueChange={(value) =>
                          handleMetricChange(metric.id, "weight", value[0])
                        }
                        max={10}
                        min={0}
                        step={1}
                        disabled={disabled}
                        className="flex-1"
                      />
                      <span className="text-sm font-bold text-indigo-600 w-6 text-center">
                        {metric.weight}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Description (What to evaluate)
                  </label>
                  <Textarea
                    value={metric.description}
                    onChange={(e) =>
                      handleMetricChange(metric.id, "description", e.target.value)
                    }
                    placeholder="Describe what should be evaluated for this metric..."
                    disabled={disabled}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMetric(metric.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          onClick={handleAddMetric}
          className="w-full border-dashed border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Metric
        </Button>
      )}

      {localMetrics.length === 0 && (
        <p className="text-sm text-gray-500 italic text-center py-4">
          No custom metrics defined. Standard evaluation criteria will be used.
        </p>
      )}
    </div>
  );
}

export default CustomMetricsEditor;

