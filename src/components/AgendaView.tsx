import React from 'react';
import { MeetingAgenda } from '@/src/types';
import { Users, Clock, Calendar, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { motion } from 'motion/react';

interface AgendaViewProps {
  agenda: MeetingAgenda | null;
}

export function AgendaView({ agenda }: AgendaViewProps) {
  if (!agenda) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
        <div className="w-24 h-24 glass-card rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Calendar className="w-10 h-10 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-semibold text-zinc-900 mb-2">No Agenda Yet</h2>
        <p className="text-zinc-600 max-w-md">
          Upload a document and click "Generate Agenda" to create a structured meeting plan.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative z-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">
            {agenda.title}
          </h1>
          <div className="flex items-center space-x-4 text-sm text-zinc-600">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1.5" />
              {agenda.totalDuration} minutes total
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1.5" />
              {agenda.stakeholders.length} Stakeholders
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-600" />
                Required Stakeholders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {agenda.stakeholders.map((stakeholder, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/50 text-indigo-800 border border-white/60 shadow-sm backdrop-blur-md"
                  >
                    {stakeholder}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-xl font-semibold text-zinc-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
            Meeting Timeline
          </h2>

          <div className="relative border-l-2 border-white/50 ml-4 space-y-8 pb-8">
            {agenda.topics.map((topic, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                className="relative pl-8"
              >
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-indigo-400 shadow-sm" />
                
                <Card className="hover:shadow-xl transition-all hover:-translate-y-1 border-white/60">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg font-semibold text-zinc-900">
                        {topic.title}
                      </CardTitle>
                      {topic.startTime && (
                        <CardDescription className="mt-1 font-mono text-xs text-zinc-600 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {topic.startTime}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center text-sm font-medium text-indigo-800 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/60 shadow-sm">
                      {topic.duration} min
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-700 text-sm leading-relaxed">
                      {topic.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
