import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useProgress } from '@/contexts/useProgress';
import { MaterialIcons as Icon, Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function QuizScreen() {
  const colorScheme = useColorScheme();
  const { addQuizScore, getQuizScoreForTopic, addTopicQuizScore } = useProgress();
  const [quizState, setQuizState] = useState<QuizState>({ 
    currentQuestion: 0, 
    selectedAnswer: null, 
    score: 0, 
    showResult: false 
  });
  const [resultSubmitted, setResultSubmitted] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showTopicSelection, setShowTopicSelection] = useState(true);
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAuth();

  const [quizTopics] = useState<QuizTopic[]>([
    {
      id: 'disaster-prep',
      title: 'Disaster Preparedness',
      description: 'Essential knowledge for emergency situations',
      icon: 'shield-checkmark',
      color: '#FF6B35',
      questions: [
        {
          id: '1',
          question: 'What is the primary purpose of a "Go-Bag" or "Bug-Out Bag" in disaster preparedness?',
          options: [
            'To store non-perishable food for long-term survival.',
            'To provide essential supplies for the first 72 hours during an evacuation.',
            'To keep important documents safe during an emergency.',
            'To carry tools for repairing damaged infrastructure.',
          ],
          correctAnswer: 1,
        },
        {
          id: '2',
          question: 'During an earthquake, what is the safest action to take?',
          options: [
            'Run outside immediately',
            'Stand in a doorway',
            'Drop, Cover, and Hold On',
            'Get under a bed',
          ],
          correctAnswer: 2,
        },
        {
          id: '3',
          question: 'How much water should you store per person per day for emergency preparedness?',
          options: [
            '1/2 gallon (2 liters)',
            '1 gallon (4 liters)',
            '2 gallons (8 liters)',
            '3 gallons (12 liters)',
          ],
          correctAnswer: 1,
        },
        {
          id: '4',
          question: 'What should you do if caught in a flash flood while driving?',
          options: [
            'Drive through the water quickly',
            'Turn around and find an alternate route',
            'Stay in the car and wait',
            'Drive slowly through the water',
          ],
          correctAnswer: 1,
        },
        {
          id: '5',
          question: 'In case of a fire emergency, what is the most important rule?',
          options: [
            'Stay low and crawl under smoke',
            'Use elevators to evacuate quickly',
            'Open windows for fresh air',
            'Gather personal belongings first',
          ],
          correctAnswer: 0,
        },
      ]
    },
    {
      id: 'first-aid',
      title: 'First Aid Basics',
      description: 'Life-saving first aid techniques and procedures',
      icon: 'medical',
      color: '#E74C3C',
      questions: [
        {
          id: '1',
          question: 'What is the correct ratio of chest compressions to rescue breaths in adult CPR?',
          options: [
            '15:2',
            '30:2',
            '5:1',
            '10:2',
          ],
          correctAnswer: 1,
        },
        {
          id: '2',
          question: 'How should you treat a severe bleeding wound?',
          options: [
            'Apply direct pressure and elevate if possible',
            'Apply a tourniquet immediately',
            'Clean the wound with alcohol first',
            'Remove any embedded objects',
          ],
          correctAnswer: 0,
        },
        {
          id: '3',
          question: 'What is the first step in treating someone who is choking but still conscious?',
          options: [
            'Perform abdominal thrusts immediately',
            'Give back blows between the shoulder blades',
            'Encourage them to cough forcefully',
            'Call emergency services first',
          ],
          correctAnswer: 2,
        },
        {
          id: '4',
          question: 'How should you treat a burn from hot liquid?',
          options: [
            'Apply ice directly to the burn',
            'Use butter or oil on the burn',
            'Cool with cold running water for 10-20 minutes',
            'Pop any blisters that form',
          ],
          correctAnswer: 2,
        },
        {
          id: '5',
          question: 'What should you do if someone is having a seizure?',
          options: [
            'Hold them down to prevent movement',
            'Put something in their mouth to prevent tongue biting',
            'Time the seizure and keep them safe from injury',
            'Give them water to prevent dehydration',
          ],
          correctAnswer: 2,
        },
      ]
    },
    {
      id: 'fire-safety',
      title: 'Fire Safety',
      description: 'Prevention and response to fire emergencies',
      icon: 'flame',
      color: '#FF4444',
      questions: [
        {
          id: '1',
          question: 'How often should you test smoke alarm batteries?',
          options: [
            'Once a year',
            'Every 6 months',
            'Monthly',
            'Only when they beep',
          ],
          correctAnswer: 2,
        },
        {
          id: '2',
          question: 'What type of fire extinguisher should be used on electrical fires?',
          options: [
            'Water-based extinguisher',
            'Foam extinguisher',
            'CO2 or dry powder extinguisher',
            'Any type will work',
          ],
          correctAnswer: 2,
        },
        {
          id: '3',
          question: 'If your clothes catch fire, what should you do?',
          options: [
            'Run to get help',
            'Stop, Drop, and Roll',
            'Use water to put it out',
            'Remove the burning clothes quickly',
          ],
          correctAnswer: 1,
        },
        {
          id: '4',
          question: 'What is the recommended evacuation time for a typical house fire?',
          options: [
            '10 minutes',
            '5 minutes',
            '2-3 minutes',
            '30 seconds',
          ],
          correctAnswer: 2,
        },
        {
          id: '5',
          question: 'Before opening a door during a fire, you should:',
          options: [
            'Open it quickly to check for fire',
            'Feel the door handle and door for heat',
            'Call out to see if anyone responds',
            'Look for smoke under the door only',
          ],
          correctAnswer: 1,
        },
      ]
    },
    {
      id: 'severe-weather',
      title: 'Severe Weather',
      description: 'Staying safe during extreme weather conditions',
      icon: 'thunderstorm',
      color: '#3498DB',
      questions: [
        {
          id: '1',
          question: 'During a tornado warning, where is the safest place to shelter?',
          options: [
            'Upper floor of a building',
            'Near windows to watch for the tornado',
            'Lowest floor, interior room, away from windows',
            'In a vehicle driving away from the tornado',
          ],
          correctAnswer: 2,
        },
        {
          id: '2',
          question: 'What wind speed defines a hurricane as Category 1?',
          options: [
            '39-73 mph',
            '74-95 mph',
            '96-110 mph',
            '111-129 mph',
          ],
          correctAnswer: 1,
        },
        {
          id: '3',
          question: 'If caught outside during a lightning storm, you should:',
          options: [
            'Lie flat on the ground',
            'Stand under a tall tree',
            'Crouch low with feet together, avoiding metal objects',
            'Keep moving to avoid being a target',
          ],
          correctAnswer: 2,
        },
        {
          id: '4',
          question: 'What is the most dangerous aspect of a hurricane?',
          options: [
            'High winds',
            'Storm surge flooding',
            'Heavy rainfall',
            'Lightning',
          ],
          correctAnswer: 1,
        },
        {
          id: '5',
          question: 'How much advance warning do tornado watches typically provide?',
          options: [
            '15-30 minutes',
            '1-2 hours',
            '4-8 hours',
            '12-24 hours',
          ],
          correctAnswer: 2,
        },
      ]
    },
    {
      id: 'home-security',
      title: 'Home Security',
      description: 'Protecting your home and family from threats',
      icon: 'home',
      color: '#9B59B6',
      questions: [
        {
          id: '1',
          question: 'What is the most effective way to secure sliding glass doors?',
          options: [
            'Install a security bar in the track',
            'Use only the built-in lock',
            'Place a chair against the door',
            'Install curtains for privacy',
          ],
          correctAnswer: 0,
        },
        {
          id: '2',
          question: 'When should you change your locks?',
          options: [
            'Only if they break',
            'After moving to a new home',
            'Every 5 years',
            'Never, if they work fine',
          ],
          correctAnswer: 1,
        },
        {
          id: '3',
          question: 'What should you do if you think someone is trying to break into your home?',
          options: [
            'Investigate the noise yourself',
            'Call emergency services and stay in a secure room',
            'Turn on all the lights',
            'Go outside to confront them',
          ],
          correctAnswer: 1,
        },
        {
          id: '4',
          question: 'How can you make your home appear occupied while away?',
          options: [
            'Leave all lights on continuously',
            'Use timers for lights and consider a house sitter',
            'Park a car in the driveway',
            'Leave the TV on loudly',
          ],
          correctAnswer: 1,
        },
        {
          id: '5',
          question: 'What information should you never give to strangers at your door?',
          options: [
            'Your name',
            'The time of day',
            'Whether you\'re home alone or family schedule',
            'The weather',
          ],
          correctAnswer: 2,
        },
      ]
    },
    {
      id: 'travel-safety',
      title: 'Travel Safety',
      description: 'Staying safe while traveling and in unfamiliar places',
      icon: 'airplane',
      color: '#F39C12',
      questions: [
        {
          id: '1',
          question: 'What should you do before traveling to a new country?',
          options: [
            'Pack as much as possible',
            'Research local laws, customs, and safety conditions',
            'Exchange all your money immediately',
            'Book the cheapest accommodation available',
          ],
          correctAnswer: 1,
        },
        {
          id: '2',
          question: 'How should you carry important documents while traveling?',
          options: [
            'Keep originals with you at all times',
            'Leave them in your hotel room',
            'Make copies and store originals separately',
            'Email them to yourself only',
          ],
          correctAnswer: 2,
        },
        {
          id: '3',
          question: 'If you feel you\'re being followed while traveling, you should:',
          options: [
            'Confront the person directly',
            'Go to a crowded, well-lit public place',
            'Return to your hotel immediately',
            'Take photos of the person',
          ],
          correctAnswer: 1,
        },
        {
          id: '4',
          question: 'What\'s the safest way to use ATMs while traveling?',
          options: [
            'Use any ATM for convenience',
            'Use ATMs inside banks or hotels when possible',
            'Always use street-side ATMs',
            'Carry large amounts of cash instead',
          ],
          correctAnswer: 1,
        },
        {
          id: '5',
          question: 'When using public Wi-Fi while traveling, you should:',
          options: [
            'Access all your accounts normally',
            'Avoid sensitive transactions and use a VPN if possible',
            'Only check social media',
            'Share the connection with other travelers',
          ],
          correctAnswer: 1,
        },
      ]
    }
  ]);

  // Get dynamic colors based on theme
  const getThemeColors = () => {
    const isDark = colorScheme === 'dark';
    return {
      iconColor: isDark ? '#FFFFFF' : '#333333',
      selectedOption: isDark ? '#E0E0E0' : '#E0F7FA',
      cardBackground: isDark ? '#2A2A2A' : '#FFFFFF',
      borderColor: isDark ? '#444444' : '#E0E0E0',
      mutedText: isDark ? '#AAAAAA' : '#666666',
      overlay: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    };
  };

  const getCurrentQuestions = () => {
    const topic = quizTopics.find(t => t.id === selectedTopic);
    return topic ? topic.questions : [];
  };

  const getCurrentTopic = () => {
    return quizTopics.find(t => t.id === selectedTopic);
  };

  const selectAnswer = (index: number) => setQuizState(prev => ({ ...prev, selectedAnswer: index }));

  const submitAnswer = () => {
    if (quizState.selectedAnswer === null) return;
    const questions = getCurrentQuestions();
    const isCorrect = quizState.selectedAnswer === questions[quizState.currentQuestion].correctAnswer;
    const newScore = isCorrect ? quizState.score + 1 : quizState.score;

    if (quizState.currentQuestion < questions.length - 1) {
      setQuizState(prev => ({ 
        ...prev, 
        currentQuestion: prev.currentQuestion + 1, 
        selectedAnswer: null, 
        score: newScore 
      }));
    } else {
      setQuizState(prev => ({ ...prev, score: newScore, showResult: true }));
      setResultSubmitted(false);
    }
  };

  const resetQuiz = () => {
    setQuizState({ currentQuestion: 0, selectedAnswer: null, score: 0, showResult: false });
    setResultSubmitted(false);
  };

  const backToTopics = () => {
    setSelectedTopic(null);
    setShowTopicSelection(true);
    resetQuiz();
  };

  const startQuiz = (topicId: string) => {
    if (!isAuthenticated && topicId !== 'disaster-prep') {
      return;
    }
    
    setSelectedTopic(topicId);
    setShowTopicSelection(false);
    resetQuiz();
  };

  const RenderResult = () => {
    const questions = getCurrentQuestions();
    const percentage = Math.round((quizState.score / questions.length) * 100);
    const isGoodScore = percentage >= 70;
    const topic = getCurrentTopic();
    const themeColors = getThemeColors();

    useEffect(() => {
      if (quizState.showResult && !resultSubmitted && selectedTopic) {
        addQuizScore(percentage);
        addTopicQuizScore(selectedTopic, percentage);
        setResultSubmitted(true);
      }
    }, [quizState.showResult, selectedTopic]);

    return (
      <ThemedView style={styles.resultSection}>
        <ThemedView style={[styles.resultCard, { backgroundColor: themeColors.cardBackground }]}>
          <Icon 
            name={isGoodScore ? "check-circle" : "info"} 
            size={60} 
            color={isGoodScore ? "#4CAF50" : "#FF9800"} 
          />
          <ThemedText type="title" style={styles.resultTitle}>
            {isGoodScore ? "Great Job!" : "Keep Learning!"}
          </ThemedText>
          <ThemedText style={styles.topicTitle}>{topic?.title}</ThemedText>
          <ThemedText style={styles.resultScore}>
            You scored {quizState.score} out of {questions.length}
          </ThemedText>
          <ThemedText style={[styles.resultPercentage, { color: isGoodScore ? "#4CAF50" : "#FF9800" }]}>
            {percentage}% Correct
          </ThemedText>
          <View style={styles.resultButtons}>
            <TouchableOpacity style={styles.retryButton} onPress={resetQuiz}>
              <ThemedText style={styles.retryButtonText}>Retake Quiz</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={backToTopics}>
              <ThemedText style={styles.backButtonText}>Choose New Topic</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ThemedView>
    );
  };

  const getUserDisplayName = () => {
    if (!user) return 'A';
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  };

  const TopicCard = ({ topic, index }: { topic: QuizTopic; index: number }) => {
    const bestScore = getQuizScoreForTopic ? getQuizScoreForTopic(topic.id) : null;
    const isLocked = !isAuthenticated && index > 0;
    const themeColors = getThemeColors();
    
    return (
      <TouchableOpacity 
        style={[
          styles.topicCard, 
          { 
            borderLeftColor: topic.color,
            backgroundColor: themeColors.cardBackground
          },
          isLocked && styles.lockedCard
        ]} 
        onPress={() => startQuiz(topic.id)}
        activeOpacity={isLocked ? 0.7 : 0.8}
      >
        <View style={[styles.topicContent, isLocked && styles.blurredContent]}>
          <View style={styles.topicHeader}>
            <View style={[styles.topicIcon, { backgroundColor: `${topic.color}20` }]}>
              <Ionicons name={topic.icon as any} size={24} color={topic.color} />
            </View>
            <View style={styles.topicInfo}>
              <ThemedText type="defaultSemiBold" style={styles.topicTitle}>{topic.title}</ThemedText>
              <ThemedText style={[styles.topicDescription, { color: themeColors.mutedText }]}>{topic.description}</ThemedText>
            </View>
          </View>
          <View style={styles.topicStats}>
            <ThemedText style={[styles.questionCount, { color: themeColors.mutedText }]}>{topic.questions.length} Questions</ThemedText>
            {bestScore !== null && (
              <ThemedText style={[styles.bestScore, { color: topic.color }]}>
                Best: {bestScore}%
              </ThemedText>
            )}
          </View>
        </View>
        
        {isLocked && (
          <View style={[styles.lockOverlay, { backgroundColor: themeColors.overlay }]}>
            <Ionicons name="lock-closed" size={32} color={themeColors.mutedText} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (showTopicSelection) {
    const themeColors = getThemeColors();
    
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50}}>
          <ThemedView style={[styles.header, { borderBottomColor: themeColors.borderColor }]}>
            <ThemedText type="title">Safety Quizzes</ThemedText>
            <View style={styles.headerRight}>
              <Ionicons name="notifications-outline" size={24} color={themeColors.iconColor} />
              <View style={styles.profileIcon}>
                <ThemedText style={styles.profileText}>{getUserDisplayName()}</ThemedText>
              </View>
            </View>
          </ThemedView>
          
          <ThemedView style={styles.topicSelection}>
            <ThemedText type="subtitle" style={styles.selectionTitle}>Choose a Topic</ThemedText>
            <ThemedText style={[styles.selectionSubtitle, { color: themeColors.mutedText }]}>
              Test your knowledge across different safety areas
            </ThemedText>
            {!isAuthenticated && (
              <ThemedText style={styles.freeTrialText}>
                🎯 Try your first quiz without logging in! Sign up to unlock all topics.
              </ThemedText>
            )}
          </ThemedView>

          <View style={styles.topicList}>
            {quizTopics.map((topic, index) => (
              <TopicCard key={topic.id} topic={topic} index={index} />
            ))}
          </View>

          {!isAuthenticated && (
            <View style={styles.signupPrompt}>
              <ThemedView style={[styles.signupCard, { backgroundColor: themeColors.cardBackground }]}>
                <Ionicons name="star" size={40} color="#FF9800" />
                <ThemedText type="subtitle" style={styles.signupTitle}>
                  Unlock All Quizzes
                </ThemedText>
                <ThemedText style={[styles.signupDescription, { color: themeColors.mutedText }]}>
                  Get access to all safety topics, track your progress, and earn achievements!
                </ThemedText>
                <TouchableOpacity style={styles.signupButton} onPress={() => navigation.navigate('AuthScreen')}>
                  <ThemedText style={styles.signupButtonText}>Sign Up to Continue</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const questions = getCurrentQuestions();
  const topic = getCurrentTopic();
  const themeColors = getThemeColors();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        <ThemedView style={[styles.header, { borderBottomColor: themeColors.borderColor }]}>
          <TouchableOpacity onPress={backToTopics} style={styles.backButtonHeader}>
            <Ionicons name="arrow-back" size={24} color={themeColors.iconColor} />
          </TouchableOpacity>
          <ThemedText type="title">{topic?.title} Quiz</ThemedText>
          <View style={{ width: 24 }} />
        </ThemedView>
        
        {quizState.showResult ? <RenderResult /> : (
          <>
            <ThemedView style={styles.questionSection}>
              <ThemedView style={[styles.questionCard, { backgroundColor: themeColors.cardBackground }]}>
                <ThemedText style={[styles.questionNumber, { color: themeColors.mutedText }]}>
                  Question {quizState.currentQuestion + 1}/{questions.length}
                </ThemedText>
                <ThemedText style={styles.questionText}>
                  {questions[quizState.currentQuestion]?.question}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            
            <View style={styles.optionsSection}>
              {questions[quizState.currentQuestion]?.options.map((option, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => selectAnswer(index)} 
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: themeColors.cardBackground,
                      borderColor: quizState.selectedAnswer === index ? '#00BCD4' : themeColors.borderColor
                    },
                    quizState.selectedAnswer === index && themeColors.selectedOption
                  ]}
                >
                  <ThemedText style={styles.optionText}>{option}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.submitSection}>
              <TouchableOpacity 
                style={[
                  styles.submitButton, 
                  quizState.selectedAnswer === null && styles.disabledButton
                ]} 
                onPress={submitAnswer} 
                disabled={quizState.selectedAnswer === null}
              >
                <ThemedText style={styles.submitButtonText}>Submit Answer</ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderBottomWidth: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  profileText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButtonHeader: { padding: 4 },
  topicSelection: { 
    padding: 20, 
    alignItems: 'center',
  },
  selectionTitle: { marginBottom: 8 },
  selectionSubtitle: { textAlign: 'center', marginBottom: 10 },
  freeTrialText: { 
    color: '#FF9800', 
    textAlign: 'center', 
    fontSize: 14, 
    fontWeight: '500',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10
  },
  topicList: { paddingHorizontal: 20 },
  topicCard: { 
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative',
  },
  lockedCard: { 
    opacity: 0.7,
  },
  topicContent: {
    position: 'relative',
  },
  blurredContent: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  topicHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  topicIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12 
  },
  topicInfo: { flex: 1 },
  topicTitle: { fontSize: 16, marginBottom: 4 },
  topicDescription: { fontSize: 14, lineHeight: 20 },
  topicStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionCount: { fontSize: 12 },
  bestScore: { fontSize: 12, fontWeight: '600' },
  signupPrompt: { 
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  signupCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  signupTitle: {
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  signupDescription: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  signupButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  questionSection: { 
    padding: 20, 
  },
  questionCard: { 
    borderRadius: 15, 
    padding: 30, 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  questionNumber: { fontSize: 14, fontWeight: '600', marginBottom: 15 },
  questionText: { fontSize: 18, fontWeight: '600', textAlign: 'center', lineHeight: 26 },
  optionsSection: { paddingHorizontal: 20 },
  optionButton: { 
    borderRadius: 15, 
    padding: 20, 
    marginBottom: 15, 
    borderWidth: 2,
    elevation: 1,
    shadowColor: '#000',
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
    backgroundColor: '#FF9800', 
    borderRadius: 15, 
    padding: 20, 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  disabledButton: { backgroundColor: '#BDBDBD' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  resultSection: { 
    padding: 20, 
    paddingTop: 40, 
  },
  resultCard: { 
    borderRadius: 15, 
    padding: 40, 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  resultTitle: { marginTop: 20, marginBottom: 10 },
  resultScore: { fontSize: 18, marginBottom: 5 },
  resultPercentage: { fontSize: 32, fontWeight: 'bold', marginBottom: 30, paddingTop: 10 },
  resultButtons: { flexDirection: 'row', gap: 12 },
  retryButton: { 
    backgroundColor: '#00BCD4', 
    borderRadius: 10, 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    flex: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  retryButtonText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  backButton: { 
    backgroundColor: '#6C757D', 
    borderRadius: 10, 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    flex: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backButtonText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
});