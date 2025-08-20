// contexts/useProgress.tsx

import { doc, getDoc, setDoc } from "firebase/firestore";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { db } from "../firebase/config";
import { useAuth } from "./AuthContext";
import { useTranslation } from "react-i18next";

// --- INTERFACES ---

interface ChecklistItem {
  id: string;
  key: string; // Language-neutral key for translation
  title: string;
  description: string;
  completed: boolean;
  category: "essentials" | "evacuation" | "communication" | "firstaid";
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
  categoryKey: "essentials" | "evacuation" | "communication" | "firstaid";
}

interface TopicQuizScores {
  [topicId: string]: number[];
}

interface Badge {
  id: string;
  key: string; // Language-neutral key for translation
  name: string;
  description: string;
  icon: string;
  color: string;
  category: "progress" | "quiz" | "streak" | "special";
  earned: boolean;
  earnedAt?: Date | null;
  requirements: {
    type:
      | "checklist"
      | "quiz_score"
      | "quiz_count"
      | "streak"
      | "perfect_scores"
      | "category_complete";
    value: number;
    category?: string;
    topicId?: string;
  };
}

interface ProgressStats {
  checklistProgress: number;
  quizPerformance: number;
  badgeAchievement: number;
  overallProgress: number;
}

interface ProgressContextType {
  checklist: ChecklistItem[];
  categories: CategoryProgress[];
  overallProgress: number;
  progressStats: ProgressStats;
  toggleChecklistItem: (id: string) => void;
  getProgressForCategory: (category: string) => number;
  topicQuizScores: TopicQuizScores;
  addTopicQuizScore: (topicId: string, score: number) => void;
  getTopicAverageScore: (topicId: string) => number;
  getTopicQuizCount: (topicId: string) => number; // <-- ADD THIS LINE

  getAllQuizStats: () => {
    totalQuizzesTaken: number;
    averageScore: number;
    perfectScores: number;
  };
  badges: Badge[];
  earnedBadges: Badge[];
  getBadgeProgress: (badgeId: string) => number;
  isLoading: boolean;
  syncData: () => Promise<void>;
}

// --- LANGUAGE-NEUTRAL DATA STRUCTURES ---

const checklistStructure = [
  { id: "1", key: "water", category: "essentials", icon: "water-drop" },
  { id: "2", key: "food", category: "essentials", icon: "restaurant" },
  { id: "3", key: "kit", category: "essentials", icon: "local-hospital" },
  { id: "4", key: "flashlight", category: "essentials", icon: "flashlight-on" },
  { id: "5", key: "whistle", category: "essentials", icon: "sports" },
  { id: "6", key: "cash", category: "essentials", icon: "attach-money" },
  { id: "7", key: "meetingPoint", category: "evacuation", icon: "location-on" },
  { id: "8", key: "goBags", category: "evacuation", icon: "work" },
  { id: "9", key: "routes", category: "evacuation", icon: "directions" },
  { id: "10", key: "drills", category: "evacuation", icon: "directions-run" },
  { id: "11", key: "contacts", category: "communication", icon: "contacts" },
  { id: "12", key: "radio", category: "communication", icon: "radio" },
  {
    id: "13",
    key: "chargers",
    category: "communication",
    icon: "battery-charging-full",
  },
  { id: "14", key: "groupChat", category: "communication", icon: "forum" },
  { id: "15", key: "cpr", category: "firstaid", icon: "favorite" },
  { id: "16", key: "woundCare", category: "firstaid", icon: "healing" },
  { id: "17", key: "response", category: "firstaid", icon: "local-hospital" },
  {
    id: "18",
    key: "medicalSupplies",
    category: "firstaid",
    icon: "medical-services",
  },
];

const badgeStructure = [
  {
    id: "first-steps",
    key: "firstSteps",
    icon: "footsteps",
    color: "#4CAF50",
    category: "progress",
    requirements: { type: "checklist", value: 1 },
  },
  {
    id: "quarter-way",
    key: "quarterChampion",
    icon: "trophy",
    color: "#FF9800",
    category: "progress",
    requirements: { type: "checklist", value: 25 },
  },
  {
    id: "halfway-hero",
    key: "halfwayHero",
    icon: "star",
    color: "#2196F3",
    category: "progress",
    requirements: { type: "checklist", value: 50 },
  },
  {
    id: "preparedness-pro",
    key: "preparednessPro",
    icon: "shield-checkmark",
    color: "#9C27B0",
    category: "progress",
    requirements: { type: "checklist", value: 75 },
  },
  {
    id: "fully-prepared",
    key: "fullyPrepared",
    icon: "checkmark-circle",
    color: "#FF6B35",
    category: "progress",
    requirements: { type: "checklist", value: 100 },
  },
  {
    id: "quiz-novice",
    key: "quizNovice",
    icon: "school",
    color: "#4CAF50",
    category: "quiz",
    requirements: { type: "quiz_count", value: 1 },
  },
  {
    id: "perfect-score",
    key: "perfectScore",
    icon: "star-outline",
    color: "#FFD700",
    category: "quiz",
    requirements: { type: "perfect_scores", value: 1 },
  },
  {
    id: "quiz-master",
    key: "quizMaster",
    icon: "library",
    color: "#9C27B0",
    category: "quiz",
    requirements: { type: "quiz_count", value: 10 },
  },
  {
    id: "perfectionist",
    key: "perfectionist",
    icon: "medal",
    color: "#FF6B35",
    category: "quiz",
    requirements: { type: "perfect_scores", value: 5 },
  },
  {
    id: "essentials-expert",
    key: "essentialsExpert",
    icon: "archive-outline",
    color: "#FF9800",
    category: "progress",
    requirements: {
      type: "category_complete",
      value: 100,
      category: "essentials",
    },
  },
  {
    id: "evacuation-expert",
    key: "evacuationExpert",
    icon: "walk-outline",
    color: "#4CAF50",
    category: "progress",
    requirements: {
      type: "category_complete",
      value: 100,
      category: "evacuation",
    },
  },
  {
    id: "communication-expert",
    key: "communicationExpert",
    icon: "chatbubbles-outline",
    color: "#00BCD4",
    category: "progress",
    requirements: {
      type: "category_complete",
      value: 100,
      category: "communication",
    },
  },
  {
    id: "firstaid-expert",
    key: "firstAidExpert",
    icon: "medkit-outline",
    color: "#F44336",
    category: "progress",
    requirements: {
      type: "category_complete",
      value: 100,
      category: "firstaid",
    },
  },
];

// --- CONTEXT AND PROVIDER ---

const ProgressContext = createContext<ProgressContextType | undefined>(
  undefined
);

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
};

export const ProgressProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Generate default state dynamically with translations
  const { t } = useTranslation();
  const defaultChecklist = useMemo(
    () =>
      checklistStructure.map((item) => ({
        ...item,
        title: t(`checklist.${item.key}.title`),
        description: t(`checklist.${item.key}.description`),
        completed: false,
        completedAt: null,
      })),
    []
  );

  const defaultBadges = useMemo(
    () =>
      badgeStructure.map((badge) => ({
        ...badge,
        name: t(`badges.${badge.key}.name`),
        description: t(`badges.${badge.key}.description`),
        earned: false,
        earnedAt: null,
      })),
    []
  );

  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);
  const [badges, setBadges] = useState<Badge[]>(defaultBadges);
  const [topicQuizScores, setTopicQuizScores] = useState<TopicQuizScores>({});
  const [isLoading, setIsLoading] = useState(true);

  const { user, isAuthenticated } = useAuth();
  const isSavingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (isAuthenticated && user?.uid && !hasLoadedRef.current) {
        await loadUserProgress();
        hasLoadedRef.current = true;
      } else if (!isAuthenticated) {
        setChecklist(defaultChecklist);
        setBadges(defaultBadges);
        setTopicQuizScores({});
        hasLoadedRef.current = false;
        setIsLoading(false);
      }
    };
    init();
  }, [isAuthenticated, user?.uid, defaultChecklist, defaultBadges]);

  const loadUserProgress = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "userProgress", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const checklistProgressMap = new Map(
          (data.checklistProgress || []).map((p: any) => [
            p.id,
            { ...p, completedAt: p.completedAt?.toDate() },
          ])
        );
        const badgeProgressMap = new Map(
          (data.badgeProgress || []).map((p: any) => [
            p.id,
            { ...p, earnedAt: p.earnedAt?.toDate() },
          ])
        );

        const mergedChecklist = defaultChecklist.map((item) => ({
          ...item,
          ...checklistProgressMap.get(item.id),
        }));
        const mergedBadges = defaultBadges.map((badge) => ({
          ...badge,
          ...badgeProgressMap.get(badge.id),
        }));

        setChecklist(mergedChecklist);
        setBadges(mergedBadges);
        setTopicQuizScores(data.topicQuizScores || {});
      } else {
        // For new users, set state to defaults
        setChecklist(defaultChecklist);
        setBadges(defaultBadges);
      }
    } catch (error) {
      console.error("Error loading user progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserProgress = async (data: {
    checklist?: ChecklistItem[];
    badges?: Badge[];
    topicQuizScores?: TopicQuizScores;
  }) => {
    if (!user?.uid || isSavingRef.current) return;
    isSavingRef.current = true;

    try {
      const { checklist: c, badges: b, topicQuizScores: tqs } = data;
      const checklistToSave = c || checklist;
      const badgesToSave = b || badges;
      const topicScoresToSave = tqs || topicQuizScores;

      const checklistProgress = checklistToSave.map(
        ({ id, completed, completedAt }) => ({
          id,
          completed,
          completedAt: completedAt || null,
        })
      );
      const badgeProgress = badgesToSave.map(({ id, earned, earnedAt }) => ({
        id,
        earned,
        earnedAt: earnedAt || null,
      }));

      const progressData = {
        checklistProgress,
        badgeProgress,
        topicQuizScores: topicScoresToSave,
        lastUpdated: new Date(),
      };

      await setDoc(doc(db, "userProgress", user.uid), progressData, {
        merge: true,
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    } finally {
      isSavingRef.current = false;
    }
  };

  // --- DERIVED STATE & CALCULATIONS ---

  const getProgressForCategory = (categoryKey: string) => {
    const categoryItems = checklist.filter(
      (item) => item.category === categoryKey
    );
    if (categoryItems.length === 0) return 0;
    const completedItems = categoryItems.filter(
      (item) => item.completed
    ).length;
    return Math.round((completedItems / categoryItems.length) * 100);
  };

  const progressStats = useMemo((): ProgressStats => {
    const completedCount = checklist.filter((item) => item.completed).length;
    const checklistProgress =
      checklist.length > 0
        ? Math.round((completedCount / checklist.length) * 100)
        : 0;

    const allScores = Object.values(topicQuizScores).flat();
    const quizPerformance =
      allScores.length > 0
        ? Math.round(
            allScores.reduce((sum, score) => sum + score, 0) / allScores.length
          )
        : 0;

    const earnedBadgeCount = badges.filter((badge) => badge.earned).length;
    const badgeAchievement =
      badges.length > 0
        ? Math.round((earnedBadgeCount / badges.length) * 100)
        : 0;

    // Weights: 50% checklist, 30% quiz, 20% badges
    const overallProgress = Math.round(
      checklistProgress * 0.5 + quizPerformance * 0.3 + badgeAchievement * 0.2
    );

    return {
      checklistProgress,
      quizPerformance,
      badgeAchievement,
      overallProgress,
    };
  }, [checklist, topicQuizScores, badges]);

  const categories = useMemo(
    (): CategoryProgress[] => [
      {
        id: "1",
        name: t("categories.essentials.name"),
        description: t("categories.essentials.description"),
        percentage: getProgressForCategory("essentials"),
        icon: "inventory",
        color: "#FF9800",
        categoryKey: "essentials",
      },
      {
        id: "2",
        name: t("categories.evacuation.name"),
        description: t("categories.evacuation.description"),
        percentage: getProgressForCategory("evacuation"),
        icon: "directions-run",
        color: "#4CAF50",
        categoryKey: "evacuation",
      },
      {
        id: "3",
        name: t("categories.communication.name"),
        description: t("categories.communication.description"),
        percentage: getProgressForCategory("communication"),
        icon: "forum",
        color: "#00BCD4",
        categoryKey: "communication",
      },
      {
        id: "4",
        name: t("categories.firstaid.name"),
        description: t("categories.firstaid.description"),
        percentage: getProgressForCategory("firstaid"),
        icon: "local-hospital",
        color: "#F44336",
        categoryKey: "firstaid",
      },
    ],
    [checklist]
  );

  const earnedBadges = useMemo(
    () => badges.filter((badge) => badge.earned),
    [badges]
  );

  // --- ACTIONS ---

  const toggleChecklistItem = (id: string) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === id
        ? {
            ...item,
            completed: !item.completed,
            completedAt: !item.completed ? new Date() : null,
          }
        : item
    );
    setChecklist(updatedChecklist);
    saveUserProgress({ checklist: updatedChecklist });
  };

  const addTopicQuizScore = (topicId: string, score: number) => {
    const newTopicScores = {
      ...topicQuizScores,
      [topicId]: [...(topicQuizScores[topicId] || []), score],
    };

    setTopicQuizScores(newTopicScores);
    saveUserProgress({ topicQuizScores: newTopicScores });
  };
  const getTopicQuizCount = (topicId: string): number => {
    const scores = topicQuizScores[topicId];
    return scores ? scores.length : 0;
  };

  const getTopicAverageScore = (topicId: string) => {
    const scores = topicQuizScores[topicId];
    if (!scores || scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  };

  const getAllQuizStats = () => {
    const allScores = Object.values(topicQuizScores).flat();
    return {
      totalQuizzesTaken: allScores.length,
      averageScore:
        allScores.length > 0
          ? Math.round(
              allScores.reduce((sum, s) => sum + s, 0) / allScores.length
            )
          : 0,
      perfectScores: allScores.filter((s) => s === 100).length,
    };
  };

  const getBadgeProgress = (badgeId: string) => {
    const badge = badges.find((b) => b.id === badgeId);
    if (!badge || badge.earned) return 100;

    let current = 0;
    const { type, value, category } = badge.requirements;

    if (type === "checklist") current = progressStats.checklistProgress;
    else if (type === "quiz_count")
      current = getAllQuizStats().totalQuizzesTaken;
    else if (type === "perfect_scores")
      current = getAllQuizStats().perfectScores;
    else if (type === "category_complete" && category)
      current = getProgressForCategory(category);

    return Math.min(Math.round((current / value) * 100), 100);
  };

  const checkAndAwardBadges = () => {
    let newlyEarned = false;
    const updatedBadges = badges.map((badge) => {
      if (badge.earned || getBadgeProgress(badge.id) < 100) return badge;
      newlyEarned = true;
      return { ...badge, earned: true, earnedAt: new Date() };
    });

    if (newlyEarned) {
      setBadges(updatedBadges);
      saveUserProgress({ badges: updatedBadges });
    }
  };

  useEffect(() => {
    if (!isLoading) {
      checkAndAwardBadges();
    }
  }, [checklist, topicQuizScores, isLoading]);

  const syncData = async () => {
    if (isAuthenticated && user?.uid) {
      await loadUserProgress();
    }
  };

  const contextValue: ProgressContextType = {
    checklist,
    categories,
    overallProgress: progressStats.overallProgress,
    progressStats,
    toggleChecklistItem,
    getProgressForCategory,
    topicQuizScores,
    addTopicQuizScore,
    getTopicQuizCount, // <-- ADD THIS LINE

    getTopicAverageScore,
    getAllQuizStats,
    badges,
    earnedBadges,
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
