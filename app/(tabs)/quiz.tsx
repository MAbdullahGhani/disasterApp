import NotificationDrawer from "@/components/NotificationSidebar";
import SidebarMenu from "@/components/SideBar";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useProgress } from "@/contexts/useProgress";
import { MaterialIcons as Icon, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Interfaces remain the same...
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  questions: QuizQuestion[];
}

interface QuizState {
  currentQuestion: number;
  selectedAnswer: number | null;
  score: number;
  showResult: boolean;
}

// Language-Neutral Structure of Quiz Data
const quizTopicsStructure = [
  {
    id: "disaster-prep",
    icon: "shield-checkmark",
    color: "#FF6B35",
    questions: [
      { id: "q1", correctAnswer: 1 },
      { id: "q2", correctAnswer: 2 },
      { id: "q3", correctAnswer: 1 },
      { id: "q4", correctAnswer: 1 },
      { id: "q5", correctAnswer: 0 },
    ],
  },
  {
    id: "first-aid",
    icon: "medical",
    color: "#E74C3C",
    questions: [
      { id: "q1", correctAnswer: 1 },
      { id: "q2", correctAnswer: 0 },
      { id: "q3", correctAnswer: 2 },
      { id: "q4", correctAnswer: 2 },
      { id: "q5", correctAnswer: 2 },
    ],
  },
  {
    id: "fire-safety",
    icon: "flame",
    color: "#FF4444",
    questions: [
      { id: "q1", correctAnswer: 2 },
      { id: "q2", correctAnswer: 2 },
      { id: "q3", correctAnswer: 1 },
      { id: "q4", correctAnswer: 2 },
      { id: "q5", correctAnswer: 1 },
    ],
  },
  {
    id: "severe-weather",
    icon: "thunderstorm",
    color: "#3498DB",
    questions: [
      { id: "q1", correctAnswer: 2 },
      { id: "q2", correctAnswer: 1 },
      { id: "q3", correctAnswer: 2 },
      { id: "q4", correctAnswer: 1 },
      { id: "q5", correctAnswer: 2 },
    ],
  },
  {
    id: "home-security",
    icon: "home",
    color: "#9B59B6",
    questions: [
      { id: "q1", correctAnswer: 0 },
      { id: "q2", correctAnswer: 1 },
      { id: "q3", correctAnswer: 1 },
      { id: "q4", correctAnswer: 1 },
      { id: "q5", correctAnswer: 2 },
    ],
  },
  {
    id: "travel-safety",
    icon: "airplane",
    color: "#F39C12",
    questions: [
      { id: "q1", correctAnswer: 1 },
      { id: "q2", correctAnswer: 2 },
      { id: "q3", correctAnswer: 1 },
      { id: "q4", correctAnswer: 1 },
      { id: "q5", correctAnswer: 1 },
    ],
  },
];

export default function QuizScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const { addTopicQuizScore, getQuizScoreForTopic } = useProgress();
  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestion: 0,
    selectedAnswer: null,
    score: 0,
    showResult: false,
  });
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [resultSubmitted, setResultSubmitted] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showTopicSelection, setShowTopicSelection] = useState(true);
  const [isLearningMode, setIsLearningMode] = useState(false);
    const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]); // <-- Add this line

  const { user, isAuthenticated } = useAuth();
  const [notiSidebarVisible, setNotiSidebarVisible] = useState(false);

  // Dynamically create translated quiz topics
  const quizTopics: QuizTopic[] = useMemo(() => {
    return quizTopicsStructure.map((topic) => ({
      id: topic.id,
      icon: topic.icon,
      color: topic.color,
      title: t(`topics.${topic.id}.title`),
      description: t(`topics.${topic.id}.description`),
      questions: topic.questions.map((q, index) => ({
        id: (index + 1).toString(),
        question: t(`topics.${topic.id}.questions.${q.id}.question`, {
          returnObjects: true,
        }),
        // vvv THIS IS THE FIX vvv
        options: t(`topics.${topic.id}.questions.${q.id}.options`, {
          returnObjects: true,
        }),
        // ^^^ THIS IS THE FIX ^^^
        correctAnswer: q.correctAnswer,
      })),
    }));
  }, [t]); // Add language dependency here if it changes during runtime

  // Get dynamic colors based on theme
  const getThemeColors = () => {
    const isDark = colorScheme === "dark";
    return {
      iconColor: isDark ? "#FFFFFF" : "#333333",
      selectedOption: isDark ? "#000000ff" : "#E0F7FA",
      cardBackground: isDark ? "#2A2A2A" : "#FFFFFF",
      borderColor: isDark ? "#444444" : "#E0E0E0",
      mutedText: isDark ? "#AAAAAA" : "#666666",
      overlay: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)",
      correctOption: "#4CAF50",
      incorrectOption: "#F44336",
    };
  };


  const getCurrentTopic = () => {
    return quizTopics.find((t) => t.id === selectedTopic);
  };
   const shuffleArray = (array: any[]) => {
    const newArray = [...array]; // Create a copy to avoid mutating the original
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Swap elements
    }
    return newArray;
  };

  const selectAnswer = (index: number) => {
    if (!isLearningMode) {
      setQuizState((prev) => ({ ...prev, selectedAnswer: index }));
    }
  };

  const submitAnswer = () => {
    if (quizState.selectedAnswer === null && !isLearningMode) return;

const questions = activeQuestions;
    const isCorrect =
      quizState.selectedAnswer ===
      questions[quizState.currentQuestion].correctAnswer;
    const newScore = isCorrect ? quizState.score + 1 : quizState.score;

    if (quizState.currentQuestion < questions.length - 1) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        selectedAnswer: null,
        score: isLearningMode ? prev.score : newScore,
      }));
    } else {
      setQuizState((prev) => ({
        ...prev,
        score: isLearningMode ? prev.score : newScore,
        showResult: true,
      }));
      setResultSubmitted(false);
    }
  };

  const resetQuiz = () => {
    // Re-shuffle questions for the current topic
    if (selectedTopic) {
      const topic = quizTopics.find((t) => t.id === selectedTopic);
      if (topic) {
        const shuffledQuestions = topic.questions.map((q) => {
          const correctAnswerText = q.options[q.correctAnswer];
          const shuffledOptions = shuffleArray(q.options);
          const newCorrectAnswerIndex =
            shuffledOptions.indexOf(correctAnswerText);
          return {
            ...q,
            options: shuffledOptions,
            correctAnswer: newCorrectAnswerIndex,
          };
        });
        setActiveQuestions(shuffledQuestions);
      }
    }

    // Reset the quiz state as before
    setQuizState({
      currentQuestion: 0,
      selectedAnswer: null,
      score: 0,
      showResult: false,
    });
    setResultSubmitted(false);
    setIsLearningMode(false);
  };

  const startLearningMode = () => {
    setIsLearningMode(true);
    setQuizState({
      currentQuestion: 0,
      selectedAnswer: null,
      score: quizState.score,
      showResult: false,
    });
  };

  const backToTopics = () => {
    setSelectedTopic(null);
    setShowTopicSelection(true);
    resetQuiz();
  };

  const startQuiz = (topicId: string) => {
    if (!isAuthenticated && topicId !== "disaster-prep") {
      return;
    }

    const topic = quizTopics.find((t) => t.id === topicId);
    if (!topic) return;

    // Create a new set of questions with shuffled options
    const shuffledQuestions = topic.questions.map((q) => {
      // Find the correct answer text before shuffling
      const correctAnswerText = q.options[q.correctAnswer];
      
      // Shuffle the options
      const shuffledOptions = shuffleArray(q.options);
      
      // Find the new index of the correct answer in the shuffled array
      const newCorrectAnswerIndex = shuffledOptions.indexOf(correctAnswerText);

      return {
        ...q,
        options: shuffledOptions,
        correctAnswer: newCorrectAnswerIndex,
      };
    });

    setActiveQuestions(shuffledQuestions);
    setSelectedTopic(topicId);
    setShowTopicSelection(false);
    resetQuiz();
  };

  const RenderResult = () => {
const questions = activeQuestions;
    const percentage = Math.round((quizState.score / questions.length) * 100);
    const isGoodScore = percentage >= 70;
    const showLearnButton = percentage < 60;
    const topic = getCurrentTopic();
    const themeColors = getThemeColors();

    useEffect(() => {
      if (
        quizState.showResult &&
        !resultSubmitted &&
        selectedTopic &&
        !isLearningMode
      ) {
        addTopicQuizScore(selectedTopic, percentage);
        setResultSubmitted(true);
      }
    }, [quizState.showResult, selectedTopic, isLearningMode]);

    return (
      <ThemedView style={styles.resultSection}>
        <ThemedView
          style={[
            styles.resultCard,
            { backgroundColor: themeColors.cardBackground },
          ]}
        >
          <Icon
            name={isGoodScore ? "check-circle" : "info"}
            size={60}
            color={isGoodScore ? "#4CAF50" : "#FF9800"}
          />
          <ThemedText type="title" style={styles.resultTitle}>
            {isLearningMode
              ? t("ui.resultLearningComplete")
              : percentage >= 70
              ? t("ui.resultGreatJob")
              : t("ui.resultKeepLearning")}
          </ThemedText>
          <ThemedText style={styles.topicTitle}>{topic?.title}</ThemedText>
          {!isLearningMode && (
            <>
              <ThemedText style={styles.resultScore}>
                {t("ui.resultScoreText", {
                  score: quizState.score,
                  total: questions.length,
                })}
              </ThemedText>
              <ThemedText
                style={[
                  styles.resultPercentage,
                  { color: percentage >= 70 ? "#4CAF50" : "#FF9800" },
                ]}
              >
                {t("ui.resultPercentageText", { percentage })}
              </ThemedText>
            </>
          )}
          {isLearningMode && (
            <ThemedText
              style={[
                styles.learningCompleteText,
                { color: getThemeColors().mutedText },
              ]}
            >
              {t("ui.resultLearningCompleteDescription")}
            </ThemedText>
          )}
          <View style={styles.resultButtons}>
            <TouchableOpacity style={styles.retryButton} onPress={resetQuiz}>
              <ThemedText style={styles.retryButtonText}>
                {t("ui.retakeButton")}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={backToTopics}>
              <ThemedText style={styles.backButtonText}>
                {t("ui.newTopicButton")}
              </ThemedText>
            </TouchableOpacity>
            {percentage < 60 && !isLearningMode && (
              <TouchableOpacity
                style={styles.learnButton}
                onPress={startLearningMode}
              >
                <ThemedText style={styles.learnButtonText}>
                  {t("ui.learnTopicButton")}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </ThemedView>
      </ThemedView>
    );
  };

  const getUserDisplayName = () => {
    if (!user) return "G";
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return "G";
  };

  const TopicCard = ({ topic, index }: { topic: QuizTopic; index: number }) => {
    const bestScore = getQuizScoreForTopic
      ? getQuizScoreForTopic(topic.id)
      : null;
    const isLocked = !isAuthenticated && index > 0;
    const themeColors = getThemeColors();

    return (
      <TouchableOpacity
        style={[
          styles.topicCard,
          {
            borderLeftColor: topic.color,
            backgroundColor: themeColors.cardBackground,
          },
          isLocked && styles.lockedCard,
        ]}
        onPress={() => startQuiz(topic.id)}
        activeOpacity={isLocked ? 0.7 : 0.8}
      >
        <View style={[styles.topicContent, isLocked && styles.blurredContent]}>
          <View style={styles.topicHeader}>
            <View
              style={[
                styles.topicIcon,
                { backgroundColor: `${topic.color}20` },
              ]}
            >
              <Ionicons
                name={topic.icon as any}
                size={24}
                color={topic.color}
              />
            </View>
            <View style={styles.topicInfo}>
              <ThemedText type="defaultSemiBold" style={styles.topicTitle}>
                {topic.title}
              </ThemedText>
              <ThemedText
                style={[
                  styles.topicDescription,
                  { color: themeColors.mutedText },
                ]}
              >
                {topic.description}
              </ThemedText>
            </View>
          </View>
          <View style={styles.topicStats}>
            <ThemedText
              style={[
                styles.questionCount,
                { color: getThemeColors().mutedText },
              ]}
            >
              {t("ui.questionCount", { count: topic.questions.length })}
            </ThemedText>
            {bestScore !== null && (
              <ThemedText style={[styles.bestScore, { color: topic.color }]}>
                {t("ui.bestScore", { score: bestScore })}
              </ThemedText>
            )}
          </View>
        </View>

        {isLocked && (
          <View
            style={[
              styles.lockOverlay,
              { backgroundColor: themeColors.overlay },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={32}
              color={themeColors.mutedText}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (showTopicSelection) {
    const themeColors = getThemeColors();

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          <ThemedView
            style={[
              styles.header,
              { borderBottomColor: themeColors.borderColor },
            ]}
          >
            <ThemedText type="title">{t("ui.mainTitle")}</ThemedText>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={{ marginLeft: 15 }}
                onPress={() => setNotiSidebarVisible(true)}
              >
                <Ionicons name="notifications-outline" size={24} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileIcon}
                onPress={() => setSidebarVisible(true)}
              >
                <ThemedText style={styles.profileText}>
                  {getUserDisplayName()}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          <ThemedView style={styles.topicSelection}>
            <ThemedText type="subtitle" style={styles.selectionTitle}>
              {t("ui.chooseTopicTitle")}
            </ThemedText>
            <ThemedText
              style={[
                styles.selectionSubtitle,
                { color: getThemeColors().mutedText },
              ]}
            >
              {t("ui.chooseTopicSubtitle")}
            </ThemedText>
            {!isAuthenticated && (
              <ThemedText style={styles.freeTrialText}>
                {t("ui.freeTrialText")}
              </ThemedText>
            )}
          </ThemedView>

          <View style={styles.topicList}>
            {quizTopics.map((topic, index) => (
              <TopicCard key={topic.id} topic={topic} index={index} />
            ))}
          </View>

          {!isAuthenticated && (
            <View style={styles.signupCard}>
              <View>
                <ThemedText type="subtitle" style={styles.signupTitle}>
                  {t("ui.unlockTitle")}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.signupDescription,
                    { color: getThemeColors().mutedText },
                  ]}
                >
                  {t("ui.unlockDescription")}
                </ThemedText>
                <TouchableOpacity
                  style={styles.signupButton}
                  onPress={() => router.push("AuthScreen")}
                >
                  <ThemedText style={styles.signupButtonText}>
                    {t("ui.signupButton")}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
        <NotificationDrawer
          visible={notiSidebarVisible}
          onClose={() => setNotiSidebarVisible(false)}
        />

        <SidebarMenu
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />
      </SafeAreaView>
    );
  }

const questions = activeQuestions;
  const topic = getCurrentTopic();
  const themeColors = getThemeColors();
  const currentQuestion = questions[quizState.currentQuestion];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <ThemedView
          style={[
            styles.header,
            { borderBottomColor: themeColors.borderColor },
          ]}
        >
          <TouchableOpacity
            onPress={backToTopics}
            style={styles.backButtonHeader}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={themeColors.iconColor}
            />
          </TouchableOpacity>
          <ThemedText type="title">
            {isLearningMode
              ? t("ui.learnHeader", { topicTitle: topic?.title })
              : t("ui.quizHeader", { topicTitle: topic?.title })}
          </ThemedText>
          <View style={{ width: 24 }} />
        </ThemedView>

        {quizState.showResult ? (
          <RenderResult />
        ) : (
          <>
            <ThemedView style={styles.questionSection}>
              <ThemedView
                style={[
                  styles.questionCard,
                  { backgroundColor: themeColors.cardBackground },
                ]}
              >
                {isLearningMode && (
                  <View style={styles.learningModeIndicator}>
                    <Ionicons name="book" size={20} color="#4CAF50" />
                    <ThemedText
                      style={[styles.learningModeText, { color: "#4CAF50" }]}
                    >
                      {t("ui.learningMode")}
                    </ThemedText>
                  </View>
                )}
                <ThemedText
                  style={[
                    styles.questionNumber,
                    { color: themeColors.mutedText },
                  ]}
                >
                  {t("ui.questionProgress", {
                    current: quizState.currentQuestion + 1,
                    total: questions.length,
                  })}
                </ThemedText>
                <ThemedText style={styles.questionText}>
                  {currentQuestion?.question}
                </ThemedText>
                {/* <ThemedText style={styles.submitButtonText}>
                  {isLearningMode ? t("ui.nextButton") : t("ui.submitButton")}
                </ThemedText> */}
              </ThemedView>
            </ThemedView>

            <View style={styles.optionsSection}>
              {currentQuestion?.options.map((option, index) => {
                const isCorrectAnswer = index === currentQuestion.correctAnswer;
                const isSelected = quizState.selectedAnswer === index;

                let optionStyle = [
                  styles.optionButton,
                  {
                    backgroundColor: themeColors.cardBackground,
                    borderColor: themeColors.borderColor,
                  },
                ];

                if (isLearningMode) {
                  if (isCorrectAnswer) {
                    optionStyle.push({
                      borderColor: themeColors.correctOption,
                      backgroundColor: `${themeColors.correctOption}20`,
                    });
                  }
                } else if (isSelected) {
                  optionStyle.push({
                    borderColor: "#00BCD4",
                    backgroundColor: themeColors.selectedOption,
                  });
                }

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => selectAnswer(index)}
                    style={optionStyle}
                    disabled={isLearningMode}
                  >
                    <View style={styles.optionContent}>
                      <ThemedText style={styles.optionText}>
                        {option}
                      </ThemedText>
                      {isLearningMode && isCorrectAnswer && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color={themeColors.correctOption}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.submitSection}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !isLearningMode &&
                    quizState.selectedAnswer === null &&
                    styles.disabledButton,
                ]}
                onPress={submitAnswer}
                disabled={!isLearningMode && quizState.selectedAnswer === null}
              >
                <ThemedText style={styles.submitButtonText}>
                  {isLearningMode ? "Next" : "Submit Answer"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 15,
  },

  learningCompleteText: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
    marginTop: 10,
  },
  learnButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    // flex: 1,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  learnButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  learningModeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  learningModeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  profileText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  backButtonHeader: { padding: 4 },
  topicSelection: {
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  selectionTitle: { marginBottom: 8 },
  selectionSubtitle: { textAlign: "center", marginBottom: 10 },
  freeTrialText: {
    color: "#FF9800",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  topicList: { paddingHorizontal: 20 },
  topicCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    position: "relative",
  },
  lockedCard: {
    opacity: 0.7,
  },
  topicContent: {
    position: "relative",
  },
  blurredContent: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  topicHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topicInfo: { flex: 1 },
  topicTitle: { fontSize: 16, marginBottom: 4 },
  topicDescription: { fontSize: 14, lineHeight: 20 },
  topicStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questionCount: { fontSize: 12 },
  bestScore: { fontSize: 12, fontWeight: "600" },
  signupPrompt: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
  },
  signupCard: {
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    margin: 29,
    borderColor: "#FF9800",
  },
  signupTitle: {
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  signupDescription: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 10,
  },
  signupButton: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 2,
    margin: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  questionSection: {
    padding: 20,
  },
  questionCard: {
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  questionNumber: { fontSize: 14, fontWeight: "600", marginBottom: 15 },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 26,
  },
  optionsSection: { paddingHorizontal: 20 },
  optionButton: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  optionText: { fontSize: 16, flex: 1, lineHeight: 22 },
  submitSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    paddingBottom: 40,
  },
  submitButton: {
    backgroundColor: "#FF9800",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  disabledButton: { backgroundColor: "#BDBDBD" },
  submitButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  resultSection: {
    padding: 20,
    paddingTop: 40,
  },
  resultCard: {
    borderRadius: 15,
    padding: 40,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  resultTitle: { marginTop: 20, marginBottom: 10 },
  resultScore: { fontSize: 18, marginBottom: 5 },
  resultPercentage: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
    paddingTop: 10,
  },
  resultButtons: { flexDirection: "column", gap: 12 },
  retryButton: {
    backgroundColor: "#00BCD4",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    // flex: 1,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  retryButtonText: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
  backButton: {
    backgroundColor: "#6C757D",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    // flex: 1,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButtonText: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
});
