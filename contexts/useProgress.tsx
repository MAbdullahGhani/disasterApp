import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'essentials' | 'evacuation' | 'communication' | 'firstaid';
  icon: string;
}

interface CategoryProgress {
  id: string;
  name: string;
  percentage: number;
  description: string;
  icon: string;
  color: string;
  categoryKey: 'essentials' | 'evacuation' | 'communication' | 'firstaid';
}

interface TopicQuizScores {
  [topicId: string]: number[]; // Array of scores for each topic
}

interface ProgressContextType {
  checklist: ChecklistItem[];
  categories: CategoryProgress[];
  overallProgress: number;
  toggleChecklistItem: (id: string) => void;
  getProgressForCategory: (category: string) => number;
  quizScores: number[];
  addQuizScore: (score: number) => void;
  // New topic-specific quiz methods
  topicQuizScores: TopicQuizScores;
  addTopicQuizScore: (topicId: string, score: number) => void;
  getQuizScoreForTopic: (topicId: string) => number | null;
  getTopicQuizCount: (topicId: string) => number;
  getTopicAverageScore: (topicId: string) => number;
  getAllQuizStats: () => {
    totalQuizzesTaken: number;
    averageScore: number;
    perfectScores: number;
    topicStats: { [key: string]: { count: number; average: number; best: number } };
  };
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};

interface ProgressProviderProps {
  children: ReactNode;
}

export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    // Emergency Essentials
    { id: '1', title: 'Secure Drinking Water', description: 'Store at least 1 gallon per person per day for 3 days.', completed: false, category: 'essentials', icon: 'water-drop' },
    { id: '2', title: 'Gather Non-Perishable Food', description: 'Include non-cook items and a manual can opener.', completed: false, category: 'essentials', icon: 'restaurant' },
    { id: '3', title: 'Assemble First Aid Kit', description: 'Include bandages, antiseptic, wipes, and essential medications.', completed: true, category: 'essentials', icon: 'local-hospital' },
    { id: '4', title: 'Pack Flashlight & Batteries', description: 'Ensure fresh batteries and a spare set.', completed: false, category: 'essentials', icon: 'flashlight-on' },
    { id: '5', title: 'Carry a Whistle', description: 'For signaling help in an emergency.', completed: false, category: 'essentials', icon: 'sports' },
    { id: '6', title: 'Store Emergency Cash', description: 'Keep small bills and coins for emergencies.', completed: false, category: 'essentials', icon: 'attach-money' },
    
    // Evacuation & Planning
    { id: '7', title: 'Establish Family Meeting Point', description: 'Designate primary and secondary locations.', completed: false, category: 'evacuation', icon: 'location-on' },
    { id: '8', title: 'Prepare Go-Bags', description: 'Personal kits with essentials for 3 days.', completed: false, category: 'evacuation', icon: 'work' },
    { id: '9', title: 'Plan Evacuation Routes', description: 'Identify multiple routes from home and work.', completed: false, category: 'evacuation', icon: 'directions' },
    { id: '10', title: 'Practice Evacuation Drills', description: 'Run through your plan with family members.', completed: true, category: 'evacuation', icon: 'directions-run' },
    
    // Communication Strategy
    { id: '11', title: 'Compile Emergency Contacts', description: 'Include family, doctors, and out-of-state contacts.', completed: true, category: 'communication', icon: 'contacts' },
    { id: '12', title: 'Obtain NOAA Weather Radio', description: 'With tone alert and extra batteries.', completed: false, category: 'communication', icon: 'radio' },
    { id: '13', title: 'Secure Portable Chargers', description: 'For phones and other essential electronics.', completed: false, category: 'communication', icon: 'battery-charging-full' },
    { id: '14', title: 'Set Up Group Communication', description: 'Create family group chat or communication plan.', completed: false, category: 'communication', icon: 'forum' },
    
    // First Aid Skills
    { id: '15', title: 'Learn Basic CPR', description: 'Complete a CPR certification course.', completed: false, category: 'firstaid', icon: 'favorite' },
    { id: '16', title: 'Practice Wound Care', description: 'Learn to clean and dress wounds properly.', completed: false, category: 'firstaid', icon: 'healing' },
    { id: '17', title: 'Study Emergency Response', description: 'Know how to respond to common emergencies.', completed: false, category: 'firstaid', icon: 'local-hospital' },
    { id: '18', title: 'Stock Medical Supplies', description: 'Maintain adequate first aid supplies.', completed: true, category: 'firstaid', icon: 'medical-services' },
  ]);

  const [quizScores, setQuizScores] = useState<number[]>([]);
  const [topicQuizScores, setTopicQuizScores] = useState<TopicQuizScores>({});

  // Calculate progress for a specific category
  const getProgressForCategory = (categoryKey: string): number => {
    const categoryItems = checklist.filter(item => item.category === categoryKey);
    if (categoryItems.length === 0) return 0;
    const completedItems = categoryItems.filter(item => item.completed).length;
    return Math.round((completedItems / categoryItems.length) * 100);
  };

  // Calculate overall progress using useMemo for performance
  const overallProgress = useMemo((): number => {
    const completedCount = checklist.filter(item => item.completed).length;
    return Math.round((completedCount / checklist.length) * 100);
  }, [checklist]);

  // Generate category data with real progress using useMemo
  const categories = useMemo((): CategoryProgress[] => {
    return [
      { id: '1', name: 'Emergency Supplies', percentage: getProgressForCategory('essentials'), description: '...', icon: 'inventory', color: '#FF9800', categoryKey: 'essentials' },
      { id: '2', name: 'Evacuation Plan', percentage: getProgressForCategory('evacuation'), description: '...', icon: 'directions-run', color: '#4CAF50', categoryKey: 'evacuation' },
      { id: '3', name: 'Communication', percentage: getProgressForCategory('communication'), description: '...', icon: 'forum', color: '#00BCD4', categoryKey: 'communication' },
      { id: '4', name: 'First Aid', percentage: getProgressForCategory('firstaid'), description: '...', icon: 'local-hospital', color: '#F44336', categoryKey: 'firstaid' },
    ];
  }, [checklist]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prevChecklist => 
      prevChecklist.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };
  
  // Function to add a new quiz score (general)
  const addQuizScore = (score: number) => {
    setQuizScores(prevScores => [...prevScores, score]);
  };

  // Add topic-specific quiz score
  const addTopicQuizScore = (topicId: string, score: number) => {
    setTopicQuizScores(prevScores => ({
      ...prevScores,
      [topicId]: [...(prevScores[topicId] || []), score]
    }));
  };

  // Get best score for a specific topic
  const getQuizScoreForTopic = (topicId: string): number | null => {
    const scores = topicQuizScores[topicId];
    if (!scores || scores.length === 0) return null;
    return Math.max(...scores);
  };

  // Get number of quizzes taken for a topic
  const getTopicQuizCount = (topicId: string): number => {
    const scores = topicQuizScores[topicId];
    return scores ? scores.length : 0;
  };

  // Get average score for a topic
  const getTopicAverageScore = (topicId: string): number => {
    const scores = topicQuizScores[topicId];
    if (!scores || scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  // Get comprehensive quiz statistics
  const getAllQuizStats = () => {
    const allScores = Object.values(topicQuizScores).flat();
    const totalQuizzesTaken = allScores.length;
    const averageScore = totalQuizzesTaken > 0 ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / totalQuizzesTaken) : 0;
    const perfectScores = allScores.filter(score => score === 100).length;

    const topicStats: { [key: string]: { count: number; average: number; best: number } } = {};
    Object.entries(topicQuizScores).forEach(([topicId, scores]) => {
      if (scores.length > 0) {
        topicStats[topicId] = {
          count: scores.length,
          average: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
          best: Math.max(...scores)
        };
      }
    });

    return {
      totalQuizzesTaken,
      averageScore,
      perfectScores,
      topicStats
    };
  };

  const contextValue: ProgressContextType = {
    checklist,
    categories,
    overallProgress,
    toggleChecklistItem,
    getProgressForCategory,
    quizScores,
    addQuizScore,
    topicQuizScores,
    addTopicQuizScore,
    getQuizScoreForTopic,
    getTopicQuizCount,
    getTopicAverageScore,
    getAllQuizStats,
  };

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
};