// Updated useProgress.tsx with comprehensive progress calculation
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext'; // Assuming you have this

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'essentials' | 'evacuation' | 'communication' | 'firstaid';
  icon: string;
  completedAt?: Date | null;
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

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  iconLibrary: 'MaterialIcons' | 'Ionicons'; // Specify the icon library
  category: 'progress' | 'quiz' | 'streak' | 'special';
  earned: boolean;
  earnedAt?: Date | null;
  requirements: {
    type: 'checklist' | 'quiz_score' | 'quiz_count' | 'streak' | 'perfect_scores' | 'category_complete';
    value: number;
    category?: string;
    topicId?: string;
  };
}

interface ProgressStats {
  checklistProgress: number;      // 0-100
  quizPerformance: number;        // 0-100 
  badgeAchievement: number;       // 0-100
  overallProgress: number;        // Weighted combination
}

interface ProgressContextType {
  checklist: ChecklistItem[];
  categories: CategoryProgress[];
  overallProgress: number;
  progressStats: ProgressStats;
  toggleChecklistItem: (id: string) => void;
  getProgressForCategory: (category: string) => number;
  quizScores: number[];
  addQuizScore: (score: number) => void;
  // Topic-specific quiz methods
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
  // Badge system
  badges: Badge[];
  earnedBadges: Badge[];
  checkAndAwardBadges: () => void;
  getBadgeProgress: (badgeId: string) => number;
  // Database related
  isLoading: boolean;
  syncData: () => Promise<void>;
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

// Default checklist items
const defaultChecklistItems: ChecklistItem[] = [
  // Emergency Essentials
  { id: '1', title: 'Secure Drinking Water', description: 'Store at least 1 gallon per person per day for 3 days.', completed: false, category: 'essentials', icon: 'water-drop' },
  { id: '2', title: 'Gather Non-Perishable Food', description: 'Include non-cook items and a manual can opener.', completed: false, category: 'essentials', icon: 'restaurant' },
  { id: '3', title: 'Assemble First Aid Kit', description: 'Include bandages, antiseptic, wipes, and essential medications.', completed: false, category: 'essentials', icon: 'local-hospital' },
  { id: '4', title: 'Pack Flashlight & Batteries', description: 'Ensure fresh batteries and a spare set.', completed: false, category: 'essentials', icon: 'flashlight-on' },
  { id: '5', title: 'Carry a Whistle', description: 'For signaling help in an emergency.', completed: false, category: 'essentials', icon: 'sports' },
  { id: '6', title: 'Store Emergency Cash', description: 'Keep small bills and coins for emergencies.', completed: false, category: 'essentials', icon: 'attach-money' },
  
  // Evacuation & Planning
  { id: '7', title: 'Establish Family Meeting Point', description: 'Designate primary and secondary locations.', completed: false, category: 'evacuation', icon: 'location-on' },
  { id: '8', title: 'Prepare Go-Bags', description: 'Personal kits with essentials for 3 days.', completed: false, category: 'evacuation', icon: 'work' },
  { id: '9', title: 'Plan Evacuation Routes', description: 'Identify multiple routes from home and work.', completed: false, category: 'evacuation', icon: 'directions' },
  { id: '10', title: 'Practice Evacuation Drills', description: 'Run through your plan with family members.', completed: false, category: 'evacuation', icon: 'directions-run' },
  
  // Communication Strategy
  { id: '11', title: 'Compile Emergency Contacts', description: 'Include family, doctors, and out-of-state contacts.', completed: false, category: 'communication', icon: 'contacts' },
  { id: '12', title: 'Obtain NOAA Weather Radio', description: 'With tone alert and extra batteries.', completed: false, category: 'communication', icon: 'radio' },
  { id: '13', title: 'Secure Portable Chargers', description: 'For phones and other essential electronics.', completed: false, category: 'communication', icon: 'battery-charging-full' },
  { id: '14', title: 'Set Up Group Communication', description: 'Create family group chat or communication plan.', completed: false, category: 'communication', icon: 'forum' },
  
  // First Aid Skills
  { id: '15', title: 'Learn Basic CPR', description: 'Complete a CPR certification course.', completed: false, category: 'firstaid', icon: 'favorite' },
  { id: '16', title: 'Practice Wound Care', description: 'Learn to clean and dress wounds properly.', completed: false, category: 'firstaid', icon: 'healing' },
  { id: '17', title: 'Study Emergency Response', description: 'Know how to respond to common emergencies.', completed: false, category: 'firstaid', icon: 'local-hospital' },
  { id: '18', title: 'Stock Medical Supplies', description: 'Maintain adequate first aid supplies.', completed: false, category: 'firstaid', icon: 'medical-services' },
];

// Default badge definitions
const defaultBadges: Badge[] = [
  // Progress Badges
  {
    id: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first checklist item',
    icon: 'footsteps',
    color: '#4CAF50',
    iconLibrary: 'Ionicons',
    category: 'progress',
    earned: false,
    requirements: { type: 'checklist', value: 1 }
  },
  {
    id: 'quarter-way',
    name: 'Quarter Champion',
    iconLibrary: 'Ionicons',
    description: 'Complete 25% of all checklist items',
    icon: 'trophy',
    color: '#FF9800',
    category: 'progress',
    earned: false,
    requirements: { type: 'checklist', value: 25 }
  },
  {
    id: 'halfway-hero',
    name: 'Halfway Hero',
    iconLibrary: 'Ionicons',
    description: 'Complete 50% of all checklist items',
    icon: 'star',
    color: '#2196F3',
    category: 'progress',
    earned: false,
    requirements: { type: 'checklist', value: 50 }
  },
  {
    id: 'preparedness-pro',
    name: 'Preparedness Pro',
    description: 'Complete 75% of all checklist items',
    icon: 'shield-checkmark',
    iconLibrary: 'Ionicons',
    color: '#9C27B0',
    category: 'progress',
    earned: false,
    requirements: { type: 'checklist', value: 75 }
  },
  {
    id: 'fully-prepared',
    name: 'Fully Prepared',
    iconLibrary: 'Ionicons',
    description: 'Complete all checklist items',
    icon: 'checkmark-circle',
    color: '#FF6B35',
    category: 'progress',
    earned: false,
    requirements: { type: 'checklist', value: 100 }
  },
  
  // Quiz Performance Badges
  {
    id: 'quiz-novice',
    name: 'Quiz Novice',
    description: 'Take your first quiz',
    icon: 'school',
    iconLibrary: 'Ionicons',
    color: '#4CAF50',
    category: 'quiz',
    earned: false,
    requirements: { type: 'quiz_count', value: 1 }
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Get 100% on any quiz',
    icon: 'star-outline',
    color: '#FFD700',
    category: 'quiz',
    earned: false,
    iconLibrary: 'Ionicons',
    requirements: { type: 'perfect_scores', value: 1 }
  },
  {
    id: 'quiz-master',
    name: 'Quiz Master',
    description: 'Take 10 quizzes',
    icon: 'library',
    color: '#9C27B0',
    iconLibrary: 'Ionicons',
    category: 'quiz',
    earned: false,
    requirements: { type: 'quiz_count', value: 10 }
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Get 5 perfect scores',
    icon: 'medal',
    color: '#FF6B35',
    iconLibrary: 'Ionicons',

    category: 'quiz',
    earned: false,
    requirements: { type: 'perfect_scores', value: 5 }
  },
  
  // Category Completion Badges
  {
    id: 'essentials-expert',
    name: 'Essentials Expert',
    description: 'Complete all Essential Supplies tasks',
    icon: 'inventory',
    color: '#FF9800',
    iconLibrary: 'MaterialIcons',
    category: 'progress',
    earned: false,
    requirements: { type: 'category_complete', value: 100, category: 'essentials' }
  },
  {
    id: 'evacuation-expert',
    name: 'Evacuation Expert',
    description: 'Complete all Evacuation Plan tasks',
    icon: 'directions-run',
    color: '#4CAF50',
        iconLibrary: 'MaterialIcons',

    category: 'progress',
    earned: false,
    requirements: { type: 'category_complete', value: 100, category: 'evacuation' }
  },
  {
    id: 'communication-expert',
    name: 'Communication Expert',
    description: 'Complete all Communication tasks',
    icon: 'forum',
    color: '#00BCD4',
        iconLibrary: 'MaterialIcons',

    category: 'progress',
    earned: false,
    requirements: { type: 'category_complete', value: 100, category: 'communication' }
  },
  {
    id: 'firstaid-expert',
    name: 'First Aid Expert',
    description: 'Complete all First Aid tasks',
    icon: 'local-hospital',
        iconLibrary: 'MaterialIcons',

    color: '#F44336',
    category: 'progress',
    earned: false,
    requirements: { type: 'category_complete', value: 100, category: 'firstaid' }
  }
];

export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklistItems);
  const [quizScores, setQuizScores] = useState<number[]>([]);
  const [topicQuizScores, setTopicQuizScores] = useState<TopicQuizScores>({});
  const [badges, setBadges] = useState<Badge[]>(defaultBadges);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get auth context
  const { user, isAuthenticated } = useAuth();
  
  // Use ref to track if we're currently saving to prevent conflicts
  const isSavingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Load user data when authenticated (only once)
  useEffect(() => {
    if (isAuthenticated && user?.uid && !hasLoadedRef.current) {
      loadUserProgress();
      hasLoadedRef.current = true;
    } else if (!isAuthenticated) {
      // Reset to default when not authenticated
      resetToDefaults();
      hasLoadedRef.current = false;
    }
  }, [isAuthenticated, user?.uid]);

  const resetToDefaults = () => {
    setChecklist(defaultChecklistItems);
    setQuizScores([]);
    setTopicQuizScores({});
    setBadges(defaultBadges);
  };

  const loadUserProgress = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'userProgress', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Process checklist data and handle missing completedAt fields
        const processedChecklist = (userData.checklist || []).map((item: any) => ({
          ...item,
          completedAt: item.completedAt ? (
            item.completedAt.seconds ? 
              new Date(item.completedAt.seconds * 1000) : 
              new Date(item.completedAt)
          ) : null
        }));

        // Process badges data
        const processedBadges = (userData.badges || defaultBadges).map((badge: any) => ({
          ...badge,
          earnedAt: badge.earnedAt ? (
            badge.earnedAt.seconds ? 
              new Date(badge.earnedAt.seconds * 1000) : 
              new Date(badge.earnedAt)
          ) : null
        }));

        setChecklist(processedChecklist);
        setQuizScores(userData.quizScores || []);
        setTopicQuizScores(userData.topicQuizScores || {});
        setBadges(processedBadges);
        
        console.log('✅ User progress loaded successfully');
      } else {
        console.log('No existing progress found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading user progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserProgress = async (dataToSave?: {
    checklist?: ChecklistItem[];
    quizScores?: number[];
    topicQuizScores?: TopicQuizScores;
    badges?: Badge[];
  }) => {
    if (!user?.uid || isSavingRef.current) return;

    isSavingRef.current = true;
    
    try {
      const userDocRef = doc(db, 'userProgress', user.uid);
      
      // Use provided data or current state
      const checklistToSave = dataToSave?.checklist || checklist;
      const quizScoresToSave = dataToSave?.quizScores || quizScores;
      const topicQuizScoresToSave = dataToSave?.topicQuizScores || topicQuizScores;
      const badgesToSave = dataToSave?.badges || badges;
      
      // Clean the data to remove undefined values
      const cleanChecklist = checklistToSave.map(item => {
        const cleanItem: any = {
          id: item.id,
          title: item.title,
          description: item.description,
          completed: item.completed,
          category: item.category,
          icon: item.icon,
        };
        
        // Only add completedAt if it exists
        if (item.completedAt) {
          cleanItem.completedAt = item.completedAt;
        }
        
        return cleanItem;
      });

      const cleanBadges = badgesToSave.map(badge => {
        const cleanBadge: any = {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          color: badge.color,
          category: badge.category,
          earned: badge.earned,
          requirements: badge.requirements,
        };
        
        // Only add earnedAt if it exists
        if (badge.earnedAt) {
          cleanBadge.earnedAt = badge.earnedAt;
        }
        
        return cleanBadge;
      });
      
      const progressData: any = {
        checklist: cleanChecklist,
        quizScores: quizScoresToSave,
        topicQuizScores: topicQuizScoresToSave,
        badges: cleanBadges,
        lastUpdated: new Date(),
        userId: user.uid,
      };
      
      // Only add userEmail if it exists
      if (user.email) {
        progressData.userEmail = user.email;
      }

      await setDoc(userDocRef, progressData, { merge: true });
      console.log('✅ Progress saved successfully');
    } catch (error) {
      console.error('❌ Error saving progress:', error);
    } finally {
      isSavingRef.current = false;
    }
  };

  // Calculate progress for a specific category
  const getProgressForCategory = (categoryKey: string): number => {
    const categoryItems = checklist.filter(item => item.category === categoryKey);
    if (categoryItems.length === 0) return 0;
    const completedItems = categoryItems.filter(item => item.completed).length;
    return Math.round((completedItems / categoryItems.length) * 100);
  };

  // Calculate comprehensive progress stats using useMemo for performance
  const progressStats = useMemo((): ProgressStats => {
    // 1. Checklist Progress (0-100)
    const completedCount = checklist.filter(item => item.completed).length;
    const checklistProgress = Math.round((completedCount / checklist.length) * 100);

    // 2. Quiz Performance (0-100)
    const allScores = Object.values(topicQuizScores).flat();
    const quizPerformance = allScores.length > 0 
      ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
      : 0;

    // 3. Badge Achievement (0-100)
    const earnedBadgeCount = badges.filter(badge => badge.earned).length;
    const badgeAchievement = Math.round((earnedBadgeCount / badges.length) * 100);

    // 4. Overall Progress (weighted combination)
    // Weights: 50% checklist, 30% quiz, 20% badges
    const overallProgress = Math.round(
      (checklistProgress * 0.5) + 
      (quizPerformance * 0.3) + 
      (badgeAchievement * 0.2)
    );

    return {
      checklistProgress,
      quizPerformance,
      badgeAchievement,
      overallProgress
    };
  }, [checklist, topicQuizScores, badges]);

  // Legacy overallProgress for backward compatibility
  const overallProgress = progressStats.overallProgress;

  // Generate category data with real progress using useMemo
  const categories = useMemo((): CategoryProgress[] => {
    return [
      { id: '1', name: 'Emergency Supplies', percentage: getProgressForCategory('essentials'), description: 'Essential items for survival', icon: 'inventory', color: '#FF9800', categoryKey: 'essentials' },
      { id: '2', name: 'Evacuation Plan', percentage: getProgressForCategory('evacuation'), description: 'Plans and preparations for evacuation', icon: 'directions-run', color: '#4CAF50', categoryKey: 'evacuation' },
      { id: '3', name: 'Communication', percentage: getProgressForCategory('communication'), description: 'Communication tools and plans', icon: 'forum', color: '#00BCD4', categoryKey: 'communication' },
      { id: '4', name: 'First Aid', percentage: getProgressForCategory('firstaid'), description: 'Medical knowledge and supplies', icon: 'local-hospital', color: '#F44336', categoryKey: 'firstaid' },
    ];
  }, [checklist]);

  // Get earned badges
  const earnedBadges = useMemo(() => {
    return badges.filter(badge => badge.earned);
  }, [badges]);

  // Check and award badges
  const checkAndAwardBadges = () => {
    const updatedBadges = badges.map(badge => {
      if (badge.earned) return badge; // Already earned

      let shouldEarn = false;
      const req = badge.requirements;

      switch (req.type) {
        case 'checklist':
          const checklistPercentage = progressStats.checklistProgress;
          shouldEarn = checklistPercentage >= req.value;
          break;

        case 'quiz_count':
          const totalQuizCount = Object.values(topicQuizScores).flat().length;
          shouldEarn = totalQuizCount >= req.value;
          break;

        case 'perfect_scores':
          const perfectScoreCount = Object.values(topicQuizScores)
            .flat()
            .filter(score => score === 100).length;
          shouldEarn = perfectScoreCount >= req.value;
          break;

        case 'category_complete':
          if (req.category) {
            const categoryProgress = getProgressForCategory(req.category);
            shouldEarn = categoryProgress >= req.value;
          }
          break;

        default:
          break;
      }

      if (shouldEarn) {
        return {
          ...badge,
          earned: true,
          earnedAt: new Date()
        };
      }

      return badge;
    });

    // Check if any new badges were earned
    const newlyEarned = updatedBadges.filter((badge, index) => 
      badge.earned && !badges[index].earned
    );

    if (newlyEarned.length > 0) {
      setBadges(updatedBadges);
      
      // Save to database if authenticated
      if (isAuthenticated && user?.uid) {
        saveUserProgress({ badges: updatedBadges });
      }

      console.log(`🏆 Earned ${newlyEarned.length} new badge(s):`, newlyEarned.map(b => b.name));
    }
  };

  // Get progress towards earning a specific badge
  const getBadgeProgress = (badgeId: string): number => {
    const badge = badges.find(b => b.id === badgeId);
    if (!badge || badge.earned) return 100;

    const req = badge.requirements;
    let current = 0;

    switch (req.type) {
      case 'checklist':
        current = progressStats.checklistProgress;
        break;
      case 'quiz_count':
        current = Object.values(topicQuizScores).flat().length;
        break;
      case 'perfect_scores':
        current = Object.values(topicQuizScores)
          .flat()
          .filter(score => score === 100).length;
        break;
      case 'category_complete':
        if (req.category) {
          current = getProgressForCategory(req.category);
        }
        break;
    }

    return Math.min(Math.round((current / req.value) * 100), 100);
  };

  // Auto-check badges when relevant data changes
  useEffect(() => {
    checkAndAwardBadges();
  }, [checklist, topicQuizScores]);

  const toggleChecklistItem = (id: string) => {
    const updatedChecklist = checklist.map(item => {
      if (item.id === id) {
        return {
          ...item,
          completed: !item.completed,
          completedAt: !item.completed ? new Date() : null
        };
      }
      return item;
    });

    // Update state immediately for responsive UI
    setChecklist(updatedChecklist);

    // Save to database if authenticated (don't await to keep UI responsive)
    if (isAuthenticated && user?.uid) {
      saveUserProgress({ checklist: updatedChecklist });
    }
  };
  
  // Function to add a new quiz score (general)
  const addQuizScore = (score: number) => {
    const newScores = [...quizScores, score];
    setQuizScores(newScores);

    // Save to database if authenticated
    if (isAuthenticated && user?.uid) {
      saveUserProgress({ quizScores: newScores });
    }
  };

  // Add topic-specific quiz score
  const addTopicQuizScore = (topicId: string, score: number) => {
    const newTopicScores = {
      ...topicQuizScores,
      [topicId]: [...(topicQuizScores[topicId] || []), score]
    };
    setTopicQuizScores(newTopicScores);

    // Save to database if authenticated
    if (isAuthenticated && user?.uid) {
      saveUserProgress({ topicQuizScores: newTopicScores });
    }
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

  // Manual sync function
  const syncData = async () => {
    if (isAuthenticated && user?.uid) {
      await loadUserProgress();
    }
  };

  const contextValue: ProgressContextType = {
    checklist,
    categories,
    overallProgress,
    progressStats,
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
    badges,
    earnedBadges,
    checkAndAwardBadges,
    getBadgeProgress,
    isLoading,
    syncData,
  };

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
};