import React from 'react';
import { MotivationDisplay } from '@/components/motivation/motivation-display';
import { MotivationModal } from '@/components/motivation/motivation-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MotivationWidget() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-center">
          <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
          <CardTitle className="text-lg">Motivation Boost</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <MotivationDisplay variant="mini" />
        <div className="mt-4 text-right">
          <MotivationModal 
            trigger={
              <Button variant="outline" size="sm" className="text-xs">
                <Lightbulb className="h-3.5 w-3.5 mr-1 text-yellow-500" />
                Get Full Motivation
              </Button>
            } 
          />
        </div>
      </CardContent>
    </Card>
  );
}