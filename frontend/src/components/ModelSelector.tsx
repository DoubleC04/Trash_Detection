
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Brain, Target, Cpu } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isConnected: boolean;
}

const models = [
  {
    id: 'yolo11',
    name: 'YOLO11',
    description: 'Latest YOLO model - Fast & Accurate',
    icon: Zap,
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'rt-detr',
    name: 'RT-DETR',
    description: 'Real-Time Detection Transformer',
    icon: Brain,
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'faster-rcnn',
    name: 'Faster R-CNN',
    description: 'High Precision Detection',
    icon: Target,
    color: 'from-green-500 to-green-600'
  }
];

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  isConnected
}) => {
  return (
    <Card className="bg-white/5 backdrop-blur-xl border border-teal-400/20 shadow-xl mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-teal-400" />
            <h3 className="text-xl font-medium text-white">AI Detection Model</h3>
          </div>
          <Badge className={isConnected 
            ? "bg-green-500/20 text-green-300 border-green-400/30" 
            : "bg-orange-500/20 text-orange-300 border-orange-400/30"
          }>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {models.map((model) => {
            const Icon = model.icon;
            const isSelected = selectedModel === model.id;
            
            return (
              <Button
                key={model.id}
                variant="ghost"
                onClick={() => onModelChange(model.id)}
                className={`h-auto p-4 flex flex-col items-start space-y-2 rounded-xl border transition-all duration-300 ${
                  isSelected
                    ? 'border-teal-400/60 bg-teal-400/10 shadow-lg'
                    : 'border-white/20 hover:border-teal-400/40 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${model.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-semibold text-white text-lg">{model.name}</h4>
                    {isSelected && (
                      <Badge className="mt-1 bg-teal-500/20 text-teal-300 border-teal-400/30 text-xs">
                        ACTIVE
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-white/70 text-left w-full">
                  {model.description}
                </p>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelSelector;
