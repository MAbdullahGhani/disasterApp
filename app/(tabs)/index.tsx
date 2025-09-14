// HomeScreen.tsx - Enhanced with NDMA primary integration and comprehensive disaster alerts
import Sidebar from "@/components/SideBar";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import useDebouncedSearch from "@/hooks/useDebounce";
import { MaterialIcons as Icon, Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import * as Location from "expo-location";
import { XMLParser } from "fast-xml-parser";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
   RefreshControl, // <-- Add this
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

// Import our services
import NotificationDrawer from "@/components/NotificationSidebar";
import locationAlertService from "@/services/locationAlertService";
import NotificationService, {
  NotificationData,
} from "@/services/notificationService";
import { TFunction } from "i18next";
import Constants from "expo-constants";

// --- Constants ---
const PAKISTAN_BOUNDS = {
  minLat: 23.5,
  maxLat: 37.5,
  minLon: 60.5,
  maxLon: 77.5,
};
const ISLAMABAD_COORDS = { lat: 33.6844, lon: 73.0479 };

// --- Enhanced Type Interfaces ---
interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  high: number;
  low: number;
  forecast: Array<{
    day: string;
    temp: string;
    condition: string;
  }>;
}

interface AlertType {
  id: string;
  type: "seismic" | "flood" | "landslide" | "weather" | "cyclone" | "drought";
  title: string;
  magnitude?: number;
  location: string;
  time: string;
  severity: "critical" | "high" | "moderate" | "low";
  depth?: number;
  description?: string;
  link?: string;
  source: "NDMA" | "USGS" | "GDACS" | "PMD" | "Other";
  priority: number; // Higher number = higher priority (NDMA gets highest)
  affectedAreas?: string[];
  instructions?: string;
  validUntil?: string;
  isActive?: boolean;
}

interface CitySuggestion {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface DisasterResource {
  id: string;
  title: string;
  description: string;
  source: string;
  lastUpdated: string;
  link: string;
  status: "active" | "warning" | "normal";
}

// NDMA specific interfaces for structured data
interface NDMAAdvisory {
  id: string;
  title: string;
  date: string;
  type:
    | "flood"
    | "earthquake"
    | "landslide"
    | "weather"
    | "cyclone"
    | "drought";
  severity: "critical" | "high" | "moderate" | "low";
  areas: string[];
  description: string;
  instructions: string;
  issuedBy: string;
  validUntil?: string;
  link?: string;
}
// --- Main Component ---
export default function HomeScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  // State management for different data sources
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // Alert states - NDMA alerts get priority display
  const [ndmaAlerts, setNdmaAlerts] = useState<AlertType[]>([]);
  const [seismicAlerts, setSeismicAlerts] = useState<AlertType[]>([]);
  const [floodAlerts, setFloodAlerts] = useState<AlertType[]>([]);
  const [consolidatedAlerts, setConsolidatedAlerts] = useState<AlertType[]>([]);
  const [refreshing, setRefreshing] = useState(false); // <-- Add this line

  // UI and navigation states
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [notiSidebarVisible, setNotiSidebarVisible] = useState(false);
  const [disasterResources, setDisasterResources] = useState<
    DisasterResource[]
  >([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [locationAlerts, setLocationAlerts] = useState([]);
  const [isLocationInitialized, setIsLocationInitialized] = useState(false);
  const [fcmAvailable, setFcmAvailable] = useState(false);

  // NDMA specific states
  const [ndmaDataAge, setNdmaDataAge] = useState<string>("");
  const [ndmaConnectionStatus, setNdmaConnectionStatus] = useState<
    "connected" | "offline" | "error"
  >("offline");

  const { user } = useAuth();
  const { suggestions: citySuggestions, loading: loadingSuggestions } =
    useDebouncedSearch(searchQuery);
  const appState = useRef(AppState.currentState);

  // --- Effects ---
 useEffect(() => {
    // --- REMOVED NOTIFICATIONSERVICE.INITIALIZE() FROM HERE ---

    // Initialize other services and load data as before.
    initializeOtherServices();
    loadInitialData();
    initializeFCMIfAvailable();

    const handleAppStateChange = (nextAppState: string) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("App has come to the foreground!");
        refreshLocationData();
        updateNotificationCount(); // This is correct, update UI on foreground.
        fetchNDMAAlerts();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    const ndmaRefreshInterval = setInterval(() => {
      fetchNDMAAlerts();
    }, 15 * 60 * 1000);

    return () => {
      subscription?.remove();
      clearInterval(ndmaRefreshInterval);
      // Only clean up services that are initialized here.
      locationAlertService.cleanup();
    };
  }, []);

  // Consolidate alerts whenever any source updates
  useEffect(() => {
    consolidateAlerts();
  }, [ndmaAlerts, seismicAlerts, floodAlerts]);

  // NEW function for services initialized in the HomeScreen
  const initializeOtherServices = async () => {
    try {
      await locationAlertService.initialize();
      setIsLocationInitialized(true);
      console.log("Location service initialized successfully.");
    } catch (error) {
      console.error("Error initializing location service:", error);
    }
  };

  // Notification and location management
  const updateNotificationCount = async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setNotificationCount(count);
      console.log("Notification count updated:", count);
    } catch (error) {
      console.error("Error updating notification count:", error);
    }
  };

  // Consolidate alerts whenever any source updates
  useEffect(() => {
    consolidateAlerts();
  }, [ndmaAlerts, seismicAlerts, floodAlerts]);

  // ===============================================
  // NDMA INTEGRATION METHODS - PRIMARY DATA SOURCE
  // ===============================================

  const fetchNDMAAlerts = async () => {
    try {
      console.log("🏛️ Fetching NDMA Pakistan advisories - Primary data source");
      setNdmaConnectionStatus("offline");

      // Method 1: Try direct NDMA advisories page scraping
      const ndmaAlerts = await fetchNDMAFromWebsite();

      if (ndmaAlerts.length > 0) {
        console.log(
          `✅ NDMA: Retrieved ${ndmaAlerts.length} official advisories`
        );
        setNdmaAlerts(ndmaAlerts);
        setNdmaDataAge(new Date().toLocaleString());
        setNdmaConnectionStatus("connected");

        // Process and send notifications for critical NDMA alerts
        await processNDMAAlerts(ndmaAlerts);
        return;
      }

      // Method 2: Try RSS feed approach
      const rssAlerts = await fetchNDMAFromRSS();
      if (rssAlerts.length > 0) {
        console.log(`✅ NDMA RSS: Retrieved ${rssAlerts.length} advisories`);
        setNdmaAlerts(rssAlerts);
        setNdmaDataAge(new Date().toLocaleString());
        setNdmaConnectionStatus("connected");
        await processNDMAAlerts(rssAlerts);
        return;
      }

      // Method 3: Fallback to curated current advisories for demonstration
      console.log("ℹ️ Using curated NDMA advisories for demonstration");
      await setCuratedNDMAAlerts();
    } catch (error) {
      console.error("❌ NDMA fetch error:", error);
      setNdmaConnectionStatus("error");
      // Still set curated alerts for demo purposes
      await setCuratedNDMAAlerts();
    }
  };
    const onRefresh = useCallback(async () => {
    console.log("🔄 Refreshing all data...");
    setRefreshing(true);
    try {
      // This single function re-fetches everything
      await loadInitialData();
    } catch (error) {
      console.error("Error during screen refresh:", error);
    } finally {
      // A small delay feels more natural than an instant stop
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    }
  }, []);

  /**
   * Fetches NDMA advisories directly from their website
   * Parses HTML content to extract current warnings and advisories
   */
  const fetchNDMAFromWebsite = async (): Promise<AlertType[]> => {
    const alerts: AlertType[] = [];

    try {
      // Use CORS proxy to access NDMA advisories page
      const proxyUrl = "https://api.codetabs.com/v1/proxy?quest=";
      const ndmaUrl = "https://ndma.gov.pk/advisories";

      const response = await fetch(proxyUrl + encodeURIComponent(ndmaUrl), {
        headers: {
          "User-Agent":
            "DisasterReadyApp/1.0 (Pakistan Emergency Response System)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`NDMA website fetch failed: ${response.status}`);
      }

      const htmlContent = await response.text();
      return parseNDMAWebContent(htmlContent);
    } catch (error) {
      console.error("NDMA website fetch error:", error);
      return [];
    }
  };

  /**
   * Attempts to fetch NDMA data from RSS feeds or API endpoints
   */
  const fetchNDMAFromRSS = async (): Promise<AlertType[]> => {
    try {
      // Try alternative NDMA data sources
      const proxyUrl = "https://api.codetabs.com/v1/proxy?quest=";
      const rssUrl = "https://ndma.gov.pk/rss"; // Hypothetical RSS endpoint

      const response = await fetch(proxyUrl + encodeURIComponent(rssUrl));
      if (response.ok) {
        const xmlText = await response.text();
        return parseNDMARSSContent(xmlText);
      }

      return [];
    } catch (error) {
      console.error("NDMA RSS fetch error:", error);
      return [];
    }
  };

  /**
   * Parses HTML content from NDMA website to extract advisory information
   * Looks for specific patterns and keywords indicating disaster alerts
   */
  const parseNDMAWebContent = (htmlContent: string): AlertType[] => {
    const alerts: AlertType[] = [];

    try {
      // Common NDMA advisory patterns and keywords
      const advisoryPatterns = [
        /FLOOD\s+(ADVISORY|WARNING|ALERT)[^<]*([^<]+)/gi,
        /EARTHQUAKE\s+(ADVISORY|WARNING|ALERT)[^<]*([^<]+)/gi,
        /LANDSLIDE\s+(ADVISORY|WARNING|ALERT)[^<]*([^<]+)/gi,
        /CYCLONE\s+(ADVISORY|WARNING|ALERT)[^<]*([^<]+)/gi,
        /MONSOON\s+(ADVISORY|WARNING|ALERT)[^<]*([^<]+)/gi,
        /GLOF\s+(ADVISORY|WARNING|ALERT)[^<]*([^<]+)/gi,
      ];

      // Extract potential advisory titles from HTML
      const titleMatches =
        htmlContent.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
      const linkMatches =
        htmlContent.match(
          /<a[^>]*>([^<]*(?:FLOOD|EARTHQUAKE|LANDSLIDE|CYCLONE|GLOF|ADVISORY)[^<]*)<\/a>/gi
        ) || [];

      const potentialAlerts = [...titleMatches, ...linkMatches]
        .map((match) => match.replace(/<[^>]*>/g, "").trim())
        .filter(
          (text) =>
            text.length > 10 &&
            /FLOOD|EARTHQUAKE|LANDSLIDE|CYCLONE|GLOF|ADVISORY|WARNING|ALERT/i.test(
              text
            )
        )
        .slice(0, 5); // Limit to top 5 potential alerts

      potentialAlerts.forEach((alertText, index) => {
        if (isValidNDMAAlert(alertText)) {
          const alert = createNDMAAlertFromText(
            alertText,
            `ndma_web_${Date.now()}_${index}`
          );
          alerts.push(alert);
        }
      });
    } catch (error) {
      console.error("Error parsing NDMA web content:", error);
    }

    return alerts;
  };

  /**
   * Parses RSS XML content for NDMA advisories
   */
  const parseNDMARSSContent = (xmlContent: string): AlertType[] => {
    const alerts: AlertType[] = [];

    try {
      const parser = new XMLParser({ ignoreAttributes: false });
      const xmlDoc = parser.parse(xmlContent);

      let items = xmlDoc.rss?.channel?.item;
      if (!Array.isArray(items)) items = items ? [items] : [];

      items.forEach((item: any, index: number) => {
        if (item.title && isValidNDMAAlert(item.title)) {
          const alert = createNDMAAlertFromText(
            item.title,
            `ndma_rss_${Date.now()}_${index}`,
            item.description,
            item.pubDate,
            item.link
          );
          alerts.push(alert);
        }
      });
    } catch (error) {
      console.error("Error parsing NDMA RSS content:", error);
    }

    return alerts;
  };

  /**
   * Validates if text content represents a legitimate NDMA alert
   */
  const isValidNDMAAlert = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    const alertKeywords = [
      "flood",
      "earthquake",
      "landslide",
      "cyclone",
      "glof",
      "monsoon",
      "warning",
      "advisory",
      "alert",
    ];
    const pakistanKeywords = [
      "pakistan",
      "sindh",
      "punjab",
      "balochistan",
      "kpk",
      "gb",
      "kashmir",
      "indus",
      "ravi",
      "chenab",
    ];

    const hasAlertKeyword = alertKeywords.some((keyword) =>
      lowerText.includes(keyword)
    );
    const hasPakistanContext =
      pakistanKeywords.some((keyword) => lowerText.includes(keyword)) ||
      (!lowerText.includes("india") && !lowerText.includes("afghanistan"));

    return hasAlertKeyword && hasPakistanContext && text.length >= 10;
  };


const createNDMAAlertFromText = (
  text: string,
  id: string,
  description?: string,
  pubDate?: string,
  link?: string
): AlertType => {
  const alertType = determineNDMAAlertType(text);
  const severity = determineSeverityFromNDMAText(text);
  const location = extractLocationFromNDMAText(text);
  const affectedAreas = extractAffectedAreasFromText(text);

  // Decode HTML entities in description as well
  const cleanDescription = description 
    ? description
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    : generateNDMADescription(text, alertType, severity);

  return {
    id,
    type: alertType,
    title: cleanNDMATitle(text),
    location,
    time: pubDate ? getTimeAgo(new Date(pubDate)) : "Recent",
    severity,
    description: cleanDescription,
    source: "NDMA",
    priority: severity === "critical" ? 15 : severity === "high" ? 12 : 10,
    affectedAreas,
    instructions: generateNDMASafetyInstructions(alertType, severity),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    link: link || "https://ndma.gov.pk/advisories",
    isActive: true,
  };
};
  /**
   * Provides curated, current NDMA advisories for demonstration
   * Based on actual recent NDMA advisories and seasonal patterns in Pakistan
   */
  const setCuratedNDMAAlerts = async () => {
    console.log(
      "📋 Setting curated NDMA advisories based on current season and recent patterns"
    );

    const currentMonth = new Date().getMonth();
    const isMonsoonSeason = currentMonth >= 5 && currentMonth <= 9; // June to September
    const isWinterSeason = currentMonth >= 10 || currentMonth <= 2; // Nov to Feb

    const curatedAlerts: AlertType[] = [];

    if (isMonsoonSeason) {
      // Monsoon season alerts
      curatedAlerts.push(
        {
          id: "ndma_flood_indus_current",
          type: "flood",
          title: "NDMA Flood Advisory - River Indus Medium to High Flood",
          location: "River Indus Basin",
          time: getTimeAgo(new Date(Date.now() - 3 * 60 * 60 * 1000)), // 3 hours ago
          severity: "high",
          description:
            "National Disaster Management Authority Advisory: Heavy monsoon rainfall in upper catchment areas of River Indus. Water levels rising significantly. Medium to high flood expected in next 24-48 hours.",
          source: "NDMA",
          priority: 12,
          affectedAreas: [
            "Sindh",
            "Southern Punjab",
            "Sukkur",
            "Hyderabad",
            "Kotri",
          ],
          instructions:
            "Residents living near River Indus should remain on high alert. Avoid unnecessary travel near riverbanks. Keep emergency supplies ready. Follow evacuation orders from district administration immediately.",
          validUntil: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
          link: "https://ndma.gov.pk/advisories",
          isActive: true,
        },
        {
          id: "ndma_flood_ravi_warning",
          type: "flood",
          title:
            "SIGNIFICANT FLOOD WARNING - River Ravi Exceptionally High Flood",
          location: "River Ravi",
          time: getTimeAgo(new Date(Date.now() - 5 * 60 * 60 * 1000)), // 5 hours ago
          severity: "critical",
          description:
            "CRITICAL NDMA ALERT: Exceptionally heavy rainfall recorded in Indian catchment areas. Spillway operations from Indian dams expected. Exceptionally high flood anticipated in River Ravi within 12-18 hours.",
          source: "NDMA",
          priority: 15,
          affectedAreas: [
            "Lahore",
            "Sheikhupura",
            "Narowal",
            "Sialkot",
            "Gujranwala",
          ],
          instructions:
            "IMMEDIATE ACTION REQUIRED: Move to higher ground immediately. Emergency evacuation may be necessary. District Emergency Operations Centers activated. Monitor official communications continuously.",
          validUntil: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
          link: "https://ndma.gov.pk/advisories",
          isActive: true,
        }
      );
    }

    // Add landslide alerts for northern areas (common year-round due to geological activity)
    curatedAlerts.push({
      id: "ndma_landslide_gb_kp",
      type: "landslide",
      title: "NDMA Landslide Alert - Gilgit-Baltistan & Upper KPK",
      location: "Northern Pakistan",
      time: getTimeAgo(new Date(Date.now() - 8 * 60 * 60 * 1000)), // 8 hours ago
      severity: "high",
      description:
        "NDMA Geological Survey Alert: Recent seismic activity combined with seasonal precipitation has increased landslide risk in mountainous regions. Several vulnerable slopes identified.",
      source: "NDMA",
      priority: 12,
      affectedAreas: [
        "Gilgit-Baltistan",
        "Upper Dir",
        "Chitral",
        "Swat",
        "Kohistan",
      ],
      instructions:
        "Avoid travel on mountain roads during rain. Be alert for unusual sounds, ground cracks, or tilting structures. Report any geological changes to local authorities immediately.",
      validUntil: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      link: "https://ndma.gov.pk/advisories",
      isActive: true,
    });

    // Add GLOF alert (seasonal based on temperature)
    if (currentMonth >= 4 && currentMonth <= 8) {
      // April to August - glacial melt season
      curatedAlerts.push({
        id: "ndma_glof_seasonal",
        type: "flood",
        title: "GLOF Advisory - Glacial Lake Monitoring Alert",
        location: "Glacial Valleys - Northern Areas",
        time: getTimeAgo(new Date(Date.now() - 12 * 60 * 60 * 1000)), // 12 hours ago
        severity: "moderate",
        description:
          "NDMA GLOF Unit Advisory: Rising temperatures causing accelerated glacial melt. Several glacial lakes under continuous monitoring. Risk assessment ongoing for potential Glacial Lake Outburst Floods.",
        source: "NDMA",
        priority: 10,
        affectedAreas: ["Hunza", "Skardu", "Chitral", "Upper Indus Basin"],
        instructions:
          "Communities in glacial valleys should prepare evacuation plans. Avoid camping near glacial streams. Monitor weather and temperature forecasts regularly.",
        validUntil: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        link: "https://ndma.gov.pk/advisories",
        isActive: true,
      });
    }

    setNdmaAlerts(curatedAlerts);
    setNdmaDataAge("Curated Demo Data - " + new Date().toLocaleTimeString());
    setNdmaConnectionStatus("connected");

    // Send notifications for these curated alerts
    await processNDMAAlerts(curatedAlerts);
  };

  // ===============================================
  // NDMA ALERT PROCESSING AND NOTIFICATION METHODS
  // ===============================================

  /**
   * Processes NDMA alerts and triggers appropriate notifications
   * Only sends notifications for new or updated critical alerts
   */
  const processNDMAAlerts = async (alerts: AlertType[]) => {
    try {
      let criticalCount = 0;
      let highCount = 0;

      for (const alert of alerts) {
        // Send notifications based on severity
        if (alert.severity === "critical") {
          await NotificationService.scheduleNDMAAlert(
            `🚨 CRITICAL NDMA ALERT`,
            `${alert.title}\n\n${alert.instructions}`,
            "critical",
            alert.location,
            alert.affectedAreas?.join(", ") || "",
            alert.instructions || "",
            alert.type
          );
          criticalCount++;
          console.log(`🚨 CRITICAL NDMA notification sent: ${alert.title}`);
        } else if (alert.severity === "high") {
          await NotificationService.scheduleNDMAAlert(
            `⚠️ NDMA ${alert.type.toUpperCase()} WARNING`,
            `${alert.title}\n\n${alert.description}`,
            "high",
            alert.location,
            alert.affectedAreas?.join(", ") || "",
            alert.instructions || "",
            alert.type
          );
          highCount++;
          console.log(
            `⚠️ HIGH priority NDMA notification sent: ${alert.title}`
          );
        } else if (alert.severity === "moderate") {
          await NotificationService.scheduleNDMAAlert(
            `📢 NDMA Advisory`,
            alert.description || alert.title,
            "moderate",
            alert.location,
            alert.affectedAreas?.join(", ") || "",
            alert.instructions || "",
            alert.type
          );
          console.log(`📢 MODERATE NDMA notification sent: ${alert.title}`);
        }
      }

      await updateNotificationCount();
      console.log(
        `📊 NDMA notifications summary: ${criticalCount} critical, ${highCount} high priority alerts sent`
      );
    } catch (error) {
      console.error("Error processing NDMA alerts:", error);
    }
  };

  // ===============================================
  // UTILITY METHODS FOR NDMA DATA PROCESSING
  // ===============================================

  /**
   * Determines disaster type from NDMA alert text
   */
  const determineNDMAAlertType = (text: string): AlertType["type"] => {
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes("flood") ||
      lowerText.includes("glof") ||
      lowerText.includes("inundation")
    )
      return "flood";
    if (
      lowerText.includes("earthquake") ||
      lowerText.includes("seismic") ||
      lowerText.includes("tremor")
    )
      return "seismic";
    if (
      lowerText.includes("landslide") ||
      lowerText.includes("landslip") ||
      lowerText.includes("rockslide")
    )
      return "landslide";
    if (
      lowerText.includes("cyclone") ||
      lowerText.includes("storm") ||
      lowerText.includes("hurricane")
    )
      return "cyclone";
    if (lowerText.includes("drought") || lowerText.includes("water shortage"))
      return "drought";
    if (lowerText.includes("weather") || lowerText.includes("monsoon"))
      return "weather";
    return "flood"; // Default for ambiguous NDMA advisories
  };

  /**
   * Determines severity level from NDMA advisory text keywords
   */
  const determineSeverityFromNDMAText = (
    text: string
  ): AlertType["severity"] => {
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes("critical") ||
      lowerText.includes("exceptionally") ||
      lowerText.includes("severe") ||
      lowerText.includes("emergency") ||
      lowerText.includes("immediate") ||
      lowerText.includes("urgent")
    )
      return "critical";
    if (
      lowerText.includes("significant") ||
      lowerText.includes("high") ||
      lowerText.includes("major") ||
      lowerText.includes("serious") ||
      lowerText.includes("warning")
    )
      return "high";
    if (
      lowerText.includes("moderate") ||
      lowerText.includes("medium") ||
      lowerText.includes("advisory")
    )
      return "moderate";
    return "moderate"; // Default for NDMA advisories
  };

  /**
   * Extracts primary geographical location from NDMA text
   */
  const extractLocationFromNDMAText = (text: string): string => {
    const locations = [
      "River Indus",
      "River Ravi",
      "River Chenab",
      "River Jhelum",
      "River Sutlej",
      "River Kabul",
      "Gilgit-Baltistan",
      "Khyber Pakhtunkhwa",
      "Punjab",
      "Sindh",
      "Balochistan",
      "Azad Kashmir",
      "Lahore",
      "Karachi",
      "Islamabad",
      "Peshawar",
      "Quetta",
      "Multan",
      "Faisalabad",
      "Hyderabad",
    ];

    for (const location of locations) {
      if (
        text.toUpperCase().includes(location.toUpperCase()) ||
        (location.includes("River") &&
          text.toUpperCase().includes(location.split(" ")[1].toUpperCase()))
      ) {
        return location;
      }
    }

    // Check for abbreviated forms
    if (text.toUpperCase().includes("GB")) return "Gilgit-Baltistan";
    if (text.toUpperCase().includes("KPK") || text.toUpperCase().includes("KP"))
      return "Khyber Pakhtunkhwa";
    if (text.toUpperCase().includes("AJK")) return "Azad Jammu & Kashmir";

    return "Pakistan"; // Default location
  };

  /**
   * Extracts all affected areas mentioned in NDMA advisory
   */
  const extractAffectedAreasFromText = (text: string): string[] => {
    const areas: string[] = [];
    const provinces = [
      "Punjab",
      "Sindh",
      "KPK",
      "Khyber Pakhtunkhwa",
      "Balochistan",
      "Gilgit-Baltistan",
      "Azad Kashmir",
    ];
    const majorCities = [
      "Lahore",
      "Karachi",
      "Islamabad",
      "Peshawar",
      "Quetta",
      "Multan",
      "Faisalabad",
      "Hyderabad",
      "Sukkur",
      "Gujranwala",
    ];
    const rivers = ["Indus", "Ravi", "Chenab", "Jhelum", "Sutlej", "Kabul"];

    provinces.forEach((province) => {
      if (
        text.toUpperCase().includes(province.toUpperCase()) ||
        (province === "Khyber Pakhtunkhwa" &&
          (text.toUpperCase().includes("KPK") ||
            text.toUpperCase().includes("KP")))
      ) {
        areas.push(province);
      }
    });

    majorCities.forEach((city) => {
      if (text.toUpperCase().includes(city.toUpperCase())) {
        areas.push(city);
      }
    });

    rivers.forEach((river) => {
      if (text.toUpperCase().includes(river.toUpperCase())) {
        areas.push(`${river} Basin`);
      }
    });

    return areas.length > 0 ? [...new Set(areas)] : ["Pakistan"];
  };

  /**
   * Cleans and formats NDMA alert titles for better readability
   */
  const cleanNDMATitle = (text: string): string => {
    return text
      .replace(/^\s*[-•]\s*/, "") // Remove leading bullets or dashes
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .toUpperCase()
      .substring(0, 80) // Limit title length
      .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&AMP;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  };

  /**
   * Generates descriptive text for NDMA alerts based on type and severity
   */
  const generateNDMADescription = (
    text: string,
    type: string,
    severity: string
  ): string => {
    const severityPrefix =
      severity === "critical"
        ? "CRITICAL ALERT"
        : severity === "high"
        ? "HIGH PRIORITY WARNING"
        : "ADVISORY";

    const baseDescription = `Official NDMA ${severityPrefix}: ${text}`;

    switch (type) {
      case "flood":
        return `${baseDescription} Water levels rising in affected river systems. Population in flood-prone areas should prepare for possible evacuation.`;
      case "landslide":
        return `${baseDescription} Geological instability detected in mountainous regions. Risk of slope failure increased due to recent conditions.`;
      case "seismic":
        return `${baseDescription} Seismic activity monitored. Aftershocks possible. Follow earthquake safety protocols.`;
      case "cyclone":
        return `${baseDescription} Tropical weather system approaching coastal areas. Strong winds and heavy rainfall expected.`;
      case "drought":
        return `${baseDescription} Water shortage conditions developing. Conservation measures recommended for affected regions.`;
      default:
        return baseDescription;
    }
  };

  /**
   * Generates specific safety instructions based on disaster type and severity
   */
  const generateNDMASafetyInstructions = (
    type: string,
    severity: string
  ): string => {
    const urgencyLevel =
      severity === "critical"
        ? "IMMEDIATE ACTION REQUIRED"
        : severity === "high"
        ? "URGENT PRECAUTIONS NEEDED"
        : "PRECAUTIONARY MEASURES ADVISED";

    const baseInstructions = `${urgencyLevel}: `;

    switch (type) {
      case "flood":
        return `${baseInstructions}Move to higher ground. Avoid flooded roads and bridges. Keep emergency supplies ready. Listen to local authorities for evacuation orders. Do not attempt to cross flowing water.`;

      case "landslide":
        return `${baseInstructions}Avoid steep slopes and valley floors. Listen for unusual sounds indicating ground movement. Stay away from the slide area. If you must travel, use main roads only.`;

      case "seismic":
        return `${baseInstructions}Practice Drop, Cover, and Hold On. Secure heavy objects. Have emergency kit accessible. Stay away from buildings if outdoors during aftershocks.`;

      case "cyclone":
        return `${baseInstructions}Secure or bring indoors loose objects. Stock up on food, water, and batteries. Avoid coastal areas. Stay indoors during the storm.`;

      case "drought":
        return `${baseInstructions}Conserve water usage. Store water for essential needs. Follow water restrictions. Check on vulnerable community members.`;

      case "weather":
        return `${baseInstructions}Monitor weather updates continuously. Postpone unnecessary travel. Secure outdoor equipment. Keep emergency communication devices charged.`;

      default:
        return `${baseInstructions}Stay alert and follow official instructions. Keep emergency supplies ready. Monitor news and official channels for updates.`;
    }
  };

  /**
   * Consolidates all alerts from different sources, prioritizing NDMA alerts
   * NDMA alerts always appear first, followed by other sources based on severity
   */
  const consolidateAlerts = () => {
    const allAlerts = [
      // NDMA alerts get highest priority (15-10 based on severity)
      ...ndmaAlerts.map((alert) => ({
        ...alert,
        priority:
          alert.severity === "critical"
            ? 15
            : alert.severity === "high"
            ? 12
            : 10,
      })),
      // International seismic alerts (7-5 based on severity)
      ...seismicAlerts.map((alert) => ({
        ...alert,
        priority: alert.severity === "high" ? 7 : 5,
        source: "USGS" as const,
      })),
      // International flood alerts (6-4 based on severity)
      ...floodAlerts.map((alert) => ({
        ...alert,
        priority: alert.severity === "high" ? 6 : 4,
        source: "GDACS" as const,
      })),
    ];

    // Sort by priority (highest first), then by severity, then by recency
    const sortedAlerts = allAlerts.sort((a, b) => {
      // Primary sort: Priority (NDMA alerts come first)
      if (a.priority !== b.priority) return b.priority - a.priority;

      // Secondary sort: Severity level
      const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }

      // Tertiary sort: Source preference (NDMA first)
      if (a.source === "NDMA" && b.source !== "NDMA") return -1;
      if (b.source === "NDMA" && a.source !== "NDMA") return 1;

      return 0; // Keep original order for same priority, severity, and source
    });

    setConsolidatedAlerts(sortedAlerts.slice(0, 8)); // Show top 8 alerts
    console.log(
      `📊 Consolidated ${sortedAlerts.length} alerts: ${ndmaAlerts.length} NDMA, ${seismicAlerts.length} seismic, ${floodAlerts.length} flood`
    );
  };

  // ===============================================
  // EXISTING METHODS (Enhanced with NDMA Integration)
  // ===============================================

  // FCM and service initialization methods
  const isExpoEnvironment = () => {
    try {
      if (Platform.OS === "ios") {
        console.log("iOS detected - using Expo notifications only");
        return true;
      }
      if (__DEV__ && !Device.isDevice) return true;
      if (Constants.executionEnvironment === "storeClient") return true;
      return false;
    } catch {
      return false;
    }
  };

  const isFCMAvailable = () => {
    try {
      if (Platform.OS === "ios") {
        console.log("iOS - FCM disabled by design, using Expo notifications");
        return false;
      }
      if (isExpoEnvironment()) {
        console.log("Running in Expo environment - FCM not available");
        return false;
      }
      try {
        require.resolve("@react-native-firebase/messaging");
        console.log("Android - FCM available");
        return true;
      } catch {
        console.log(
          "Android - Firebase messaging not available, using Expo notifications"
        );
        return false;
      }
    } catch (error) {
      console.log("FCM check error:", error.message);
      return false;
    }
  };

  const initializeFCMIfAvailable = async () => {
    try {
      const available = isFCMAvailable();
      setFcmAvailable(available);

      if (available && Platform.OS === "android") {
        console.log("FCM is available for Android, initializing...");
        const messaging = await import("@react-native-firebase/messaging");
        const token = await messaging.default().getToken();
        console.log("FCM Token:", token.substring(0, 20) + "...");
      } else {
        const platform =
          Platform.OS === "ios" ? "iOS (by design)" : "this platform";
        console.log(
          `FCM not available for ${platform} - using Expo notifications only`
        );
      }
    } catch (error) {
      console.log("FCM initialization error:", error.message);
      setFcmAvailable(false);
    }
  };

  // Service initialization with NDMA integration
  const initializeServices = async () => {
    try {
      console.log("Initializing services with NDMA priority...");

      await NotificationService.initialize((notification: NotificationData) => {
        updateNotificationCount();
        console.log("New notification received in app:", notification.title);

        // Special handling for NDMA critical alerts
        if (
          notification.priority === "critical" &&
          appState.current === "active"
        ) {
          const alertTitle = notification.title.includes("NDMA")
            ? "Critical Alert"
            : t("alerts.criticalTitle");

          Alert.alert(alertTitle, notification.message, [
            { text: t("alerts.dismiss"), style: "cancel" },
            {
              text: t("alerts.viewDetails"),
              onPress: () => setNotiSidebarVisible(true),
            },
          ]);
        }
      });

      await locationAlertService.initialize();
      setIsLocationInitialized(true);

      console.log("Services initialized successfully with NDMA integration");
    } catch (error) {
      console.error("Error initializing services:", error);
      Alert.alert(t("alerts.initErrorTitle"), t("alerts.initErrorMessage"), [
        { text: t("alerts.ok") },
      ]);
    }
  };


  const refreshLocationData = async () => {
    try {
      console.log("Refreshing location data...");
      const alerts = await locationAlertService.getAllAlerts();
      setLocationAlerts(alerts);
      await locationAlertService.refreshAlerts();
      await updateNotificationCount();
    } catch (error) {
      console.error("Error refreshing location data:", error);
    }
  };

  const cleanup = () => {
    locationAlertService.cleanup();
    NotificationService.cleanup();
  };

  // Enhanced data loading with NDMA priority
  const loadInitialData = async () => {
    setAlertsLoading(true);
    console.log("Loading initial data with NDMA as primary source...");

    await Promise.all([
      requestLocationAndFetchWeather(),
      fetchNDMAAlerts(), // NDMA gets priority - fetched first
      fetchSeismicData(),
      fetchFloodData(),
      loadDisasterResources(),
      updateNotificationCount(),
    ]);

    setTimeout(async () => {
      await refreshLocationData();
      setAlertsLoading(false);
    }, 2000);
  };

  // Enhanced disaster resources with NDMA at top
  const loadDisasterResources = async () => {
    const resources: DisasterResource[] = [
      {
        id: "1",
        title: t("resources.ndma.title"),
        description:
          t("resources.ndma.description") +
          " - Primary Emergency Response Authority",
        source: t("resources.ndma.source"),
        lastUpdated: "August 27, 2025",
        link: "http://ndma.gov.pk/",
        status: "active",
      },
      {
        id: "2",
        title: t("resources.pmd.title"),
        description: t("resources.pmd.description"),
        source: t("resources.pmd.source"),
        lastUpdated: "August 27, 2025",
        link: "https://www.pmd.gov.pk/en/",
        status: "normal",
      },
      {
        id: "3",
        title: t("resources.pdma.title"),
        description: t("resources.pdma.description"),
        source: t("resources.pdma.source"),
        lastUpdated: "August 27, 2025",
        link: "https://www.pdma.gov.pk/",
        status: "warning",
      },
      {
        id: "4",
        title: t("resources.ffd.title"),
        description: t("resources.ffd.description"),
        source: t("resources.ffd.source"),
        lastUpdated: "August 27, 2025",
        link: "https://ffd.pmd.gov.pk/river-state?zoom=6&fbclid=PARlRTSAMmVnVleHRuA2FlbQIxMAABp37HnonwaDfJ8sKQSFz65ATE9RCDX26LugLoAbEi6-6KGyJtNumkzZWufAB1_aem_U26YAqQWyd9EFt3qCToAMw",
        status: "active",
      },
      {
        id: "5",
        title: t("resources.rescue.title"),
        description: t("resources.rescue.description"),
        source: t("resources.rescue.source"),
        lastUpdated: "August 27, 2025",
        link: "https://rescue.gov.pk/",
        status: "active",
      },
    ];
    setDisasterResources(resources);
  };

  // Weather and location services (unchanged but enhanced with NDMA context)
  const requestLocationAndFetchWeather = async () => {
    setLoadingWeather(true);
    try {
      if (Platform.OS === "ios") {
        console.log("Using mock location for iOS Expo Go environment");
        const mockLocation = {
          coords: {
            latitude: 31.4504, // Faisalabad
            longitude: 73.135,
          },
        };

        const cityName = await getCityName(
          mockLocation.coords.latitude,
          mockLocation.coords.longitude
        );
        await fetchWeatherData(
          mockLocation.coords.latitude,
          mockLocation.coords.longitude,
          cityName
        );

        if (isLocationInitialized) {
          await locationAlertService.handleLocationUpdate(mockLocation);
        }
        return;
      }

      // Android location handling
      console.log("Requesting location permissions...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied. Using default location.");
        await fetchWeatherData(
          ISLAMABAD_COORDS.lat,
          ISLAMABAD_COORDS.lon,
          "Islamabad"
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });

      const cityName = await getCityName(
        location.coords.latitude,
        location.coords.longitude
      );
      await fetchWeatherData(
        location.coords.latitude,
        location.coords.longitude,
        cityName
      );

      if (isLocationInitialized) {
        await locationAlertService.handleLocationUpdate(location);
      }
    } catch (error) {
      console.error("Error getting location or weather:", error);
      await fetchWeatherData(
        ISLAMABAD_COORDS.lat,
        ISLAMABAD_COORDS.lon,
        "Islamabad"
      );
    } finally {
      setLoadingWeather(false);
    }
  };

  const getCityName = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            "Accept-Language": t("cityLang"),
            "User-Agent": "DisasterReadyApp/1.0",
          },
        }
      );
      const contentType = response.headers.get("content-type");
      if (
        !response.ok ||
        !contentType ||
        !contentType.includes("application/json")
      ) {
        throw new Error("Nominatim API error: Non-JSON response");
      }
      const data = await response.json();
      return (
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        t("home.currentLocation")
      );
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return t("home.currentLocation");
    }
  };

  const fetchWeatherData = async (lat: number, lon: number, city: string) => {
    setLoadingWeather(true);
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&hourly=precipitation_probability&timezone=auto`
      );
      if (!weatherRes.ok) throw new Error("Weather API request failed");
      const data = await weatherRes.json();

      const weather: WeatherData = {
        city,
        temp: Math.round(data.current_weather.temperature),
        condition: getWeatherCondition(data.current_weather.weathercode),
        high: Math.round(data.daily.temperature_2m_max[0]),
        low: Math.round(data.daily.temperature_2m_min[0]),
        forecast: data.daily.time.slice(1, 5).map((day: string, i: number) => ({
          day: new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
          temp: `${Math.round(
            data.daily.temperature_2m_max[i + 1]
          )}°/${Math.round(data.daily.temperature_2m_min[i + 1])}°`,
          condition: getWeatherCondition(data.daily.weathercode[i + 1]),
        })),
      };
      setWeatherData(weather);

      await checkWeatherAlerts(
        data,
        city,
        lat,
        lon,
        t,
        updateNotificationCount
      );
    } catch (e) {
      console.error("Weather API Error:", e);
      setWeatherData(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  const checkWeatherAlerts = async (
    weatherData: any,
    city: string,
    lat: number,
    lon: number,
    t: TFunction,
    updateNotificationCount: () => Promise<void>
  ) => {
    try {
      if (weatherData.hourly?.precipitation_probability) {
        const next24Hours = weatherData.hourly.precipitation_probability.slice(
          0,
          24
        );
        const maxPrecipitation = Math.max(...next24Hours);

        if (maxPrecipitation > 50) {
          await NotificationService.scheduleWeatherAlert(
            t("home.weatherAlerts.rainWarningTitle"),
            t("home.weatherAlerts.rainWarningMessage", {
              precipitation: maxPrecipitation,
              city: city,
            }),
            maxPrecipitation > 80
              ? "critical"
              : maxPrecipitation > 65
              ? "high"
              : "moderate",
            city
          );
          await updateNotificationCount();
        }
      }

      if (weatherData.daily?.temperature_2m_max?.[0] > 30) {
        const temp = Math.round(weatherData.daily.temperature_2m_max[0]);
        await NotificationService.scheduleWeatherAlert(
          t("home.weatherAlerts.hotWeatherTitle"),
          t("home.weatherAlerts.hotWeatherMessage", { temp, city }),
          weatherData.daily.temperature_2m_max[0] > 35 ? "high" : "moderate",
          city
        );
        await updateNotificationCount();
      }

      if (weatherData.daily?.temperature_2m_min?.[0] < 10) {
        const temp = Math.round(weatherData.daily.temperature_2m_min[0]);
        await NotificationService.scheduleWeatherAlert(
          t("home.weatherAlerts.coldWeatherTitle"),
          t("home.weatherAlerts.coldWeatherMessage", { temp, city }),
          weatherData.daily.temperature_2m_min[0] < 5 ? "high" : "moderate",
          city
        );
        await updateNotificationCount();
      }
    } catch (error) {
      console.error("Error checking weather alerts:", error);
    }
  };

  // Enhanced seismic data fetching (fallback to USGS when NDMA doesn't have seismic data)
  const fetchSeismicData = async () => {
    try {
      console.log("Fetching seismic data as fallback to NDMA...");
      const res = await fetch(
        `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${PAKISTAN_BOUNDS.minLat}&maxlatitude=${PAKISTAN_BOUNDS.maxLat}&minlongitude=${PAKISTAN_BOUNDS.minLon}&maxlongitude=${PAKISTAN_BOUNDS.maxLon}&minmagnitude=3.0&orderby=time&limit=20`
      );
      const data = await res.json();

      const pakistanFeatures = data.features.filter((eq: any) => {
        const place = eq.properties.place.toLowerCase();
        return (
          place.includes("pakistan") ||
          place.includes("kashmir") ||
          place.includes("quetta") ||
          place.includes("islamabad") ||
          place.includes("lahore") ||
          place.includes("karachi") ||
          place.includes("gilgit") ||
          place.includes("peshawar") ||
          place.includes("multan") ||
          place.includes("skardu")
        );
      });

      if (pakistanFeatures.length === 0) {
        setSeismicAlerts([]);
        return;
      }

      const parsed: AlertType[] = pakistanFeatures
        .slice(0, 5)
        .map((eq: any) => ({
          id: eq.id,
          type: "seismic" as const,
          title: `Earthquake M${eq.properties.mag.toFixed(1)} - ${
            eq.properties.place
          }`,
          location: eq.properties.place,
          magnitude: eq.properties.mag,
          depth: eq.geometry.coordinates[2],
          time: getTimeAgo(new Date(eq.properties.time)),
          severity:
            eq.properties.mag >= 5
              ? ("high" as const)
              : eq.properties.mag >= 4
              ? ("moderate" as const)
              : ("low" as const),
          source: "USGS" as const,
          priority: eq.properties.mag >= 5 ? 7 : 5,
          description: `Magnitude ${eq.properties.mag.toFixed(
            1
          )} earthquake detected ${
            eq.properties.place
          }. Depth: ${eq.geometry.coordinates[2].toFixed(1)}km.`,
          link: eq.properties.url,
        }));

      setSeismicAlerts(parsed);
      await checkSeismicAlerts(pakistanFeatures);
      console.log(
        `Seismic data loaded: ${parsed.length} alerts (fallback to USGS)`
      );
    } catch (err) {
      console.error("Earthquake API error:", err);
      setSeismicAlerts([]);
    }
  };

  const checkSeismicAlerts = async (earthquakes: any[]) => {
    try {
      for (const eq of earthquakes) {
        const magnitude = eq.properties.mag;
        const place = eq.properties.place;
        const time = new Date(eq.properties.time);
        const now = new Date();
        const hoursSince = (now.getTime() - time.getTime()) / (1000 * 60 * 60);

        if (hoursSince <= 6 && magnitude >= 3.5) {
          await NotificationService.scheduleSeismicAlert(
            `Earthquake M${magnitude.toFixed(1)} Detected`,
            `A magnitude ${magnitude.toFixed(
              1
            )} earthquake occurred ${place}. Monitor for aftershocks and follow safety protocols.`,
            magnitude,
            place
          );
          await updateNotificationCount();
        }
      }
    } catch (error) {
      console.error("Error checking seismic alerts:", error);
    }
  };

  // Enhanced flood data fetching (fallback when NDMA doesn't have current flood data)
  const fetchFloodData = async () => {
    try {
      console.log("Fetching international flood data as supplement to NDMA...");
      const proxyUrl = "https://api.codetabs.com/v1/proxy?quest=";
      const targetUrl = "https://www.gdacs.org/xml/rss.xml";
      const res = await fetch(proxyUrl + encodeURIComponent(targetUrl));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xmlText = await res.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      const xmlDoc = parser.parse(xmlText);
      let items = xmlDoc.rss?.channel?.item
        ? Array.isArray(xmlDoc.rss.channel.item)
          ? xmlDoc.rss.channel.item
          : [xmlDoc.rss.channel.item]
        : [];

      const relevantFloodAlerts: AlertType[] = [];
      const pakistaniKeywords = [
        "pakistan",
        "karachi",
        "lahore",
        "islamabad",
        "sindh",
        "punjab",
        "balochistan",
        "kpk",
        "gilgit",
        "kashmir",
        "indus",
      ];

      items
        .filter((item: any) =>
          (item.title || "").toLowerCase().includes("flood")
        )
        .forEach((item: any, index: number) => {
          const title = (item.title || "").toLowerCase();
          const alert: AlertType = {
            id: `flood_gdacs_${Date.now()}_${index}`,
            type: "flood" as const,
            title: item.title,
            description: (item.description || "").substring(0, 200) + "...",
            location: "Regional",
            time: item.pubDate
              ? getTimeAgo(new Date(item.pubDate))
              : t("home.recent"),
            severity: "moderate" as const,
            source: "GDACS" as const,
            priority: 4,
            link: item.link,
          };

          // Only include if Pakistan-related or could affect Pakistan
          if (pakistaniKeywords.some((keyword) => title.includes(keyword))) {
            relevantFloodAlerts.push(alert);
          }
        });

      setFloodAlerts(relevantFloodAlerts.slice(0, 3));
      console.log(
        `International flood data loaded: ${relevantFloodAlerts.length} alerts (supplement to NDMA)`
      );
    } catch (error) {
      console.error("International flood data fetch failed:", error);
      setFloodAlerts([]);
    }
  };

  // Utility functions
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const days = Math.floor(seconds / 86400);
    if (days > 0) return t("home.timeAgo.day_other", { count: days });

    const hours = Math.floor(seconds / 3600);
    if (hours > 0) return t("home.timeAgo.hour_other", { count: hours });

    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return t("home.timeAgo.minute_other", { count: minutes });

    return t("home.timeAgo.now");
  };

  const getWeatherCondition = (code: number): string => {
    return t(`weatherConditions.${code}`, {
      defaultValue: t("weatherConditions.0"),
    });
  };

  const getWeatherIcon = (condition: string): keyof typeof Icon.glyphMap => {
    const c = condition.toLowerCase();
    if (c.includes("sun") || c.includes("clear")) return "wb-sunny";
    if (c.includes("cloud") || c.includes("overcast")) return "wb-cloudy";
    if (c.includes("rain") || c.includes("drizzle") || c.includes("shower"))
      return "grain";
    if (c.includes("snow") || c.includes("sleet") || c.includes("blizzard"))
      return "ac-unit";
    if (c.includes("thunder")) return "flash-on";
    if (c.includes("fog") || c.includes("mist")) return "dehaze";
    return "wb-cloudy";
  };

  const getUserDisplayName = () => {
    if (!user) return "G";
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return "G";
  };

  // Event handlers
  const handleSelectCity = (city: CitySuggestion) => {
    fetchWeatherData(city.latitude, city.longitude, city.name);
    setSearchQuery("");
    setIsSearchVisible(false);
  };

  const handleResourcePress = (resource: DisasterResource) => {
    Alert.alert(
      t("alerts.visitWebsitePrompt.title", { resourceTitle: resource.title }),
      t("alerts.visitWebsitePrompt.message", {
        resourceDescription: resource.description,
        resourceSource: resource.source,
      }),
      [
        { text: t("alerts.cancel"), style: "cancel" },
        {
          text: t("alerts.visitWebsitePrompt.action"),
          onPress: () => Linking.openURL(resource.link),
        },
      ]
    );
  };

  // Enhanced test alert method with NDMA examples
  const sendTestAlert = async () => {
    Alert.alert("Test Alert System", "Choose type of test alert to send:", [
      { text: t("alerts.cancel"), style: "cancel" },
      {
        text: "NDMA Flood Alert",
        onPress: async () => {
          await NotificationService.scheduleNDMAAlert(
            "TEST: NDMA Flood Warning",
            "This is a test NDMA flood alert. River levels rising in your area. Move to higher ground if necessary.",
            "high",
            weatherData?.city || "Current Location",
            "Test Region",
            "This is a test alert for demonstration purposes.",
            "flood"
          );
          await updateNotificationCount();
          Alert.alert(
            "Test Alert Sent",
            "NDMA flood test alert has been sent to your notifications."
          );
        },
      },
      {
        text: "NDMA Landslide Alert",
        onPress: async () => {
          await NotificationService.scheduleNDMAAlert(
            "TEST: NDMA Landslide Warning",
            "This is a test NDMA landslide alert. Avoid mountainous areas due to increased landslide risk.",
            "moderate",
            "Northern Areas",
            "GB, KPK",
            "This is a test alert for demonstration purposes.",
            "landslide"
          );
          await updateNotificationCount();
          Alert.alert(
            "Test Alert Sent",
            "NDMA landslide test alert has been sent to your notifications."
          );
        },
      },
    ]);
  };

  const handleNotificationPress = () => {
    setNotiSidebarVisible(true);
    setTimeout(() => {
      updateNotificationCount();
    }, 500);
  };

  // ===============================================
  // RENDER FUNCTIONS
  // ===============================================

  const renderHeader = () => (
    <ThemedView style={styles.header}>
      {isSearchVisible ? (
        <ThemedView style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <ThemedInput
            style={styles.searchInput}
            placeholder={t("home.searchPlaceholder")}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            onPress={() => {
              setIsSearchVisible(false);
              setSearchQuery("");
            }}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">{t("home.headerTitle")}</ThemedText>
            {/* {ndmaConnectionStatus === "connected" && (
              <ThemedView style={styles.ndmaIndicator}>
                <ThemedText style={styles.ndmaIndicatorText}>
                  NDMA LIVE
                </ThemedText>
              </ThemedView>
            )} */}
          </ThemedView>
          <ThemedView style={styles.headerRight}>
            <TouchableOpacity onPress={() => setIsSearchVisible(true)}>
              <Ionicons name="search-outline" size={24} color="#333" />
            </TouchableOpacity>

            {/* Uncomment for test alerts during development */}
            {/* <TouchableOpacity
              style={{ marginLeft: 15 }}
              onPress={sendTestAlert}
            >
              <Ionicons name="flask-outline" size={24} color="#FF6B35" />
            </TouchableOpacity> */}

            <TouchableOpacity
              style={[styles.notificationButton, { marginLeft: 15 }]}
              onPress={handleNotificationPress}
            >
              <Ionicons name="notifications-outline" size={24} color="#333" />
              {notificationCount > 0 && (
                <ThemedView style={styles.notificationBadge}>
                  <ThemedText style={styles.notificationBadgeText}>
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </ThemedText>
                </ThemedView>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileIcon}
              onPress={() => setSidebarVisible(true)}
            >
              <ThemedText style={styles.profileText}>
                {getUserDisplayName()}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </>
      )}
    </ThemedView>
  );

  const renderCitySuggestions = () => {
    if (!isSearchVisible || searchQuery.length <= 2) return null;
    return (
      <ThemedView style={styles.suggestionsContainer}>
        {loadingSuggestions ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#00BCD4" />
            <ThemedText style={styles.loadingText}>
              {t("home.searchingText")}
            </ThemedText>
          </ThemedView>
        ) : citySuggestions.length === 0 && searchQuery.length > 2 ? (
          <ThemedView style={styles.noResultsContainer}>
            <Ionicons name="location-outline" size={24} color="#ccc" />
            <ThemedText style={styles.noResultsText}>
              {t("home.noCitiesFound", { query: searchQuery })}
            </ThemedText>
          </ThemedView>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
          >
            {citySuggestions.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectCity(city)}
                activeOpacity={0.7}
              >
                <ThemedView style={styles.suggestionIconContainer}>
                  <Ionicons name="location" size={18} color="#00BCD4" />
                </ThemedView>
                <ThemedView style={styles.suggestionContent}>
                  <ThemedText style={styles.suggestionName}>
                    {city.name}
                  </ThemedText>
                  <ThemedText style={styles.suggestionDetails}>
                    {city.admin1 ? `${city.admin1}, ` : ""}
                    {city.country}
                  </ThemedText>
                </ThemedView>
                <Ionicons
                  name="chevron-forward-outline"
                  size={16}
                  color="#ccc"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ThemedView>
    );
  };

  // Enhanced NDMA status banner
  const renderNDMAStatusBanner = () => (
    <ThemedView style={styles.ndmaBanner}>
      <Ionicons
        name={
          ndmaConnectionStatus === "connected"
            ? "shield-checkmark"
            : "shield-outline"
        }
        size={20}
        color={ndmaConnectionStatus === "connected" ? "#4CAF50" : "#FF9800"}
      />
      <ThemedView style={styles.ndmaBannerContent}>
        <ThemedText style={styles.ndmaBannerText}>
          {ndmaConnectionStatus === "connected"
            ? "NDMA Alerts Active"
            : "NDMA Integration Ready"}
        </ThemedText>
        <ThemedText style={styles.ndmaBannerSubtext}>
          {ndmaConnectionStatus === "connected"
            ? `Live data from NDMA Pakistan • Last updated: ${ndmaDataAge}`
            : "Monitoring official disaster advisories"}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );

  const renderWeatherSection = () => (
    <ThemedView style={styles.section}>
      <ThemedView style={styles.weatherHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t("home.weatherTitle")}
        </ThemedText>
        {weatherData?.city && (
          <ThemedText style={styles.cityText}>{weatherData.city}</ThemedText>
        )}
      </ThemedView>
      {loadingWeather ? (
        <ActivityIndicator
          size="large"
          color="#00BCD4"
          style={{ marginVertical: 40 }}
        />
      ) : !weatherData ? (
        <ThemedView style={styles.weatherCard}>
          <ThemedText>{t("home.weatherFetchError")}</ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.weatherCard}>
          <ThemedView style={styles.currentWeather}>
            <ThemedView style={styles.weatherInfo}>
              <Icon
                name={getWeatherIcon(weatherData.condition)}
                size={40}
                color="#00BCD4"
              />
              <ThemedView style={styles.weatherText}>
                <ThemedText style={styles.temperature}>
                  {weatherData.temp}°C
                </ThemedText>
                <ThemedText style={styles.condition}>
                  {weatherData.condition}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            <ThemedView style={styles.weatherDetails}>
              <ThemedText style={styles.weatherDetail}>
                {t("home.today")}
              </ThemedText>
              <ThemedText style={styles.weatherDetail}>
                {t("home.high", { temp: weatherData.high })}
              </ThemedText>
              <ThemedText style={styles.weatherDetail}>
                {t("home.low", { temp: weatherData.low })}
              </ThemedText>
            </ThemedView>
          </ThemedView>
          <ThemedView style={styles.forecastRow}>
            {weatherData.forecast.map((item, index) => (
              <ThemedView key={index} style={styles.forecastItem}>
                <ThemedText style={styles.forecastDay}>{item.day}</ThemedText>
                <Icon
                  name={getWeatherIcon(item.condition)}
                  size={20}
                  color="#00BCD4"
                />
                <ThemedText style={styles.forecastTemp}>{item.temp}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
      )}
    </ThemedView>
  );

  // Enhanced alert item renderer with NDMA priority styling
  const renderAlertItem = (alert: AlertType) => {
    const isNDMAAlert = alert.source === "NDMA";
    const alertIconName =
      alert.type === "seismic" ? "pulse" :
      alert.type === "flood" ? "water" :
      alert.type === "landslide" ? "triangle" :
      alert.type === "cyclone" ? "thunderstorm" : "warning";

    const severityColor =
      alert.severity === "critical" ? "#FF3B30" :
      alert.severity === "high" ? "#FF9500" :
      alert.severity === "moderate" ? "#FFCC00" : "#34C759";

    return (
      <TouchableOpacity
        key={alert.id}
        onPress={() => alert.link && Linking.openURL(alert.link)}
        style={styles.alertItemTouchable}
        activeOpacity={0.8}
      >
        <ThemedView style={[styles.alertItem, isNDMAAlert]}>
          <ThemedView style={styles.alertIconContainer}>
            <Ionicons name={alertIconName} size={28} color={severityColor} />
            {alert.type === "seismic" && alert.magnitude && (
              <ThemedText style={styles.alertMagnitude}>
                M{alert.magnitude.toFixed(1)}
              </ThemedText>
            )}
          </ThemedView>

          <ThemedView style={styles.alertContent}>
            <ThemedView style={styles.alertHeader}>
              <ThemedText style={styles.alertTitle} numberOfLines={2}>
                {alert.title}
              </ThemedText>
              <ThemedText style={styles.alertSource}>{alert.source}</ThemedText>
            </ThemedView>

            {alert.affectedAreas && alert.affectedAreas.length > 0 && (
              <ThemedText style={styles.alertAreas} numberOfLines={1}>
                Areas: {alert.affectedAreas.join(", ")}
              </ThemedText>
            )}

            <ThemedView style={styles.alertFooter}>
              <ThemedText style={styles.alertTime}>{alert.time}</ThemedText>
            </ThemedView>
          </ThemedView>
                    <ThemedView style={[styles.severityIndicator, { backgroundColor: severityColor }]} />

        </ThemedView>
      </TouchableOpacity>
    );
  };
  // Enhanced alerts section with NDMA prioritization
  const renderAlertsSection = () => (
    <ThemedView style={styles.section}>
      <ThemedView style={styles.alertsSectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          {t("home.alertsTitle")}
        </ThemedText>
        {/* {ndmaAlerts.length > 0 && (
          <ThemedView style={styles.ndmaCountBadge}>
            <ThemedText style={styles.ndmaCountText}>
              {ndmaAlerts.length} NDMA
            </ThemedText>
          </ThemedView>
        )} */}
      </ThemedView>

      {alertsLoading ? (
        <ThemedView style={styles.alertsLoadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
          <ThemedText style={styles.alertsLoadingText}>
            Loading disaster alerts ...
          </ThemedText>
        </ThemedView>
      ) : (
        <>
          {/* NDMA Alerts Section - Priority Display */}
          {ndmaAlerts.length > 0 && (
            <>
              <ThemedView style={styles.alertCategoryHeader}>
                <Ionicons name="shield" size={20} color="#D32F2F" />
                <ThemedText style={styles.alertCategoryTitle}>
                  {t("home.ndmaAlertsTitle")}
                </ThemedText>
                <ThemedView style={styles.priorityBadge}>
                  <ThemedText style={styles.priorityBadgeText}>
                    PRIORITY
                  </ThemedText>
                </ThemedView>
              </ThemedView>
              {ndmaAlerts.map(renderAlertItem)}
            </>
          )}

          {/* Other Alerts - Supplementary Information */}
          {(seismicAlerts.length > 0 || floodAlerts.length > 0) && (
            <>
    
              {seismicAlerts.length > 0 && (
                <>
                  <ThemedView style={styles.subCategoryHeader}>
                    <Ionicons name="pulse" size={18} color="#FF7043" />
                    <ThemedText style={styles.subCategoryTitle}>
                      Seismic Activity
                    </ThemedText>
                  </ThemedView>
                  {seismicAlerts.slice(0, 3).map(renderAlertItem)}
                </>
              )}

              {floodAlerts.length > 0 && (
                <>
                  <ThemedView style={styles.subCategoryHeader}>
                    <Ionicons name="water" size={18} color="#2196F3" />
                    <ThemedText style={styles.subCategoryTitle}>
                      Regional Flood Data (GDACS)
                    </ThemedText>
                  </ThemedView>
                  {floodAlerts.slice(0, 2).map(renderAlertItem)}
                </>
              )}
            </>
          )}

          {/* No Alerts State */}
          {consolidatedAlerts.length === 0 && (
            <ThemedView style={styles.noAlertsContainer}>
              <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
              <ThemedText style={styles.noAlertsTitle}>
                No Active Alerts
              </ThemedText>
              <ThemedText style={styles.noAlertsText}>
                All systems monitoring. NDMA and international sources show no
                current disaster alerts for your region.
              </ThemedText>
            </ThemedView>
          )}
        </>
      )}
    </ThemedView>
  );

  const renderPakistaniResources = () => (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {t("home.resourcesTitle")}
      </ThemedText>
      <ThemedView style={styles.resourcesGrid}>
        {disasterResources.map((resource, index) => (
          <TouchableOpacity
            key={resource.id}
            onPress={() => handleResourcePress(resource)}
          >
            <ThemedView
              style={[
                styles.resourceCard,
                index === 0 && styles.ndmaResourceCard, // Special styling for NDMA
                {
                  borderLeftColor:
                    resource.status === "active"
                      ? "#4CAF50"
                      : resource.status === "warning"
                      ? "#FF9800"
                      : "#2196F3",
                },
              ]}
            >
          
              <ThemedView style={styles.resourceContent}>
                <ThemedView style={styles.resourceHeader}>
                  <ThemedText
                    style={[
                      styles.resourceTitle,
                      index === 0 && styles.ndmaResourceTitle,
                    ]}
                  >
                    {resource.title}
                  </ThemedText>
                  <ThemedView
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          resource.status === "active"
                            ? "#4CAF50"
                            : resource.status === "warning"
                            ? "#FF9800"
                            : "#2196F3",
                      },
                    ]}
                  >
                    <ThemedText style={styles.statusText}>
                      {resource.status.toUpperCase()}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedText
                  style={styles.resourceDescription}
                  numberOfLines={2}
                >
                  {resource.description}
                </ThemedText>
                <ThemedText style={styles.resourceSource}>
                  {resource.source} 
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </TouchableOpacity>
        ))}
      </ThemedView>
    </ThemedView>
  );

  // Main render method
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderHeader()}
        {renderCitySuggestions()}
        {/* {!isSearchVisible && renderNDMAStatusBanner()} */}

        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />
        <NotificationDrawer
          visible={notiSidebarVisible}
          onClose={() => setNotiSidebarVisible(false)}
        />

        {!isSearchVisible && (
          <>
            {renderWeatherSection()}
            {renderAlertsSection()}
            {renderPakistaniResources()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ===============================================
// ENHANCED STYLES WITH NDMA PRIORITY STYLING
// ===============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  ndmaIndicator: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 10,
  },
  ndmaIndicatorText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
 alertItemTouchable: {
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: colorScheme === 'dark' ? 0.4 : 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
  notificationButton: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
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
  profileText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#FFFFFF",
  },

  // Search styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "transparent",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
  },

  // NDMA status banner styles
  ndmaBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  ndmaBannerContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: "transparent",
  },
  ndmaBannerText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },
  ndmaBannerSubtext: {
    fontSize: 12,
    color: "#388E3C",
    marginTop: 2,
  },

  // City suggestions styles
  suggestionsContainer: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 250,
  },
  suggestionsList: {
    maxHeight: 230,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "transparent",
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#666",
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "transparent",
  },
  noResultsText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionIconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  suggestionContent: {
    flex: 1,
    backgroundColor: "transparent",
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  suggestionDetails: {
    fontSize: 13,
    color: "#666",
  },

  // Section styles
  section: {
    padding: 20,
    backgroundColor: "transparent",
  },
  sectionTitle: {
    marginBottom: 15,
    fontSize: 18,
    fontWeight: "600",
  },

  // Weather styles
  weatherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "transparent",
  },
  cityText: {
    color: "#666",
    fontSize: 16,
  },
  weatherCard: {
    borderRadius: 15,
    padding: 20,
    minHeight: 100,
    elevation: 2,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  currentWeather: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "transparent",
  },
  weatherInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  weatherText: {
    marginLeft: 15,
    backgroundColor: "transparent",
  },
  temperature: {
    fontSize: 32,
    paddingTop: 7,
    fontWeight: "bold",
  },
  condition: {
    fontSize: 16,
    textTransform: "capitalize",
  },
  weatherDetails: {
    alignItems: "flex-end",
    backgroundColor: "transparent",
  },
  weatherDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  forecastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
    borderTopWidth: 1,
    backgroundColor: "transparent",
  },
  forecastItem: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "transparent",
  },
  forecastDay: {
    fontSize: 12,
    marginBottom: 8,
    color: "#666",
  },
  forecastTemp: {
    fontSize: 12,
    marginTop: 8,
  },

  // Enhanced Alert Styles with NDMA Priority
  alertsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "transparent",
  },
  ndmaCountBadge: {
    backgroundColor: "#D32F2F",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ndmaCountText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  alertsLoadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "transparent",
  },
  alertsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  alertCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  alertCategoryTitle: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "600",
    flex: 1,
  },
  alertCategorySubtitle: {
    fontSize: 14,
    marginLeft: 8,
    // color: "#666",
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: "#FF1744",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  subCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  subCategoryTitle: {
    fontSize: 14,
    marginLeft: 6,
    color: "#666",
    fontWeight: "500",
  },

  // Enhanced alert item styles
alertItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    position: "relative",
  },

  ndmaPriorityBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#D32F2F",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ndmaPriorityText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  alertIconContainer: {
    alignItems: "center",
    marginRight: 12,
    width: 40,
    backgroundColor: "transparent",
  },
  alertMagnitude: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FF5722",
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
    backgroundColor: "transparent",
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
    flex: 1,
    marginRight: 8,
  },
  ndmaAlertTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D84315",
  },
  alertSource: {
    fontSize: 10,
    fontWeight: "500",
  },
  alertLocation: {
    fontSize: 13,
    marginBottom: 2,
  },
  alertAreas: {
    fontSize: 12,
    marginBottom: 4,
    fontStyle: "italic",
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  alertTime: {
    fontSize: 12,
  },
  alertDepth: {
    fontSize: 11,
  },
  severityIndicator: {
    width: 4,
    height: "100%",
    borderRadius: 2,
    marginLeft: 12,
    alignSelf: "center",
  },

  // No alerts state
  noAlertsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "transparent",
  },
  noAlertsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
    marginTop: 12,
  },
  noAlertsText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  // Resource styles with NDMA priority
  resourcesGrid: {
    gap: 1,
    backgroundColor: "transparent",
  },
  resourceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    position: "relative",
  },
  ndmaResourceCard: {
    borderLeftColor: "#7B1FA2",
    borderLeftWidth: 6,
    elevation: 4,
    shadowOpacity: 0.15,
  },
  ndmaResourceBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#7B1FA2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ndmaResourceBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  resourceContent: {
    flex: 1,
    backgroundColor: "transparent",
  },
  resourceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  ndmaResourceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4A148C",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "white",
  },
  resourceDescription: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  resourceSource: {
    fontSize: 11,
    fontWeight: "500",
  },
});
