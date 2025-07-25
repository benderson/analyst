import { Metadata } from 'next';
import { ResearchPanel } from '@/components/research-panel';

export const metadata: Metadata = {
  title: 'Research Assistant',
  description: 'AI-powered research assistant with expert panel interviews',
};

export default function ResearchPage() {
  return (
    <div className="flex h-screen bg-background">
      <ResearchPanel className="flex-1" />
    </div>
  );
}