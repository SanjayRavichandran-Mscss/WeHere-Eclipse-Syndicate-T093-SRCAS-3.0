// import { View, Text } from "react-native";
// import Header from "../components/Header";

// export default function DonateBlood() {
//   return (
//     <View style={{ flex: 1 }}>
//       {/* Header */}
//       <Header showEmergency />

//       {/* Screen Content */}
//       <View
//         style={{
//           flex: 1,
//           justifyContent: "center",
//           alignItems: "center",
//         }}
//       >
//         <Text style={{ fontSize: 20 }}>Donate Blood</Text>
//       </View>
//     </View>
//   );
// }










import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  Switch,
  ActivityIndicator,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Header from "../wedonate_components/Header";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const { width } = Dimensions.get("window");

// Backend base URL
const API_BASE_URL = "http://192.168.10.168:5000";


interface BloodNeed {
  blood_requirement_id: number;
  request_user_id: number;
  request_username: string;
  request_type: "patient" | "organization";
  patient_name?: string;
  hospital_name?: string;
  organization_name?: string;
  event_name?: string;
  contact_person_name: string;
  contact_number: string;
  blood_group: string | "any";
  location_name: string;
  required_date: string;
  units_required: number;
  additional_notes: string | null;
  created_at: string;
  requirement_status: number;
  requirement_status_name: "Active" | "Inactive";
}

export default function DonateBlood() {
  const [activeTab, setActiveTab] = useState<"donate" | "request">("donate");
  const [requestType, setRequestType] = useState<"patient" | "organization">("patient");
  const [acceptAny, setAcceptAny] = useState(false);

  const [form, setForm] = useState({
    requesterName: "",
    contactPerson: "",
    contactPhone: "",
    bloodGroup: "",
    units: "",
    additionalNotes: "",
    hospitalName: "",
    requiredByDate: "",
    campName: "",
    campVenue: "",
    campDate: "",
  });

  const [needs, setNeeds] = useState<BloodNeed[]>([]);
  const [loadingNeeds, setLoadingNeeds] = useState(false);
  const [errorNeeds, setErrorNeeds] = useState<string | null>(null);

  // Which requests the current user has already responded to → show real phone
  const [respondedTo, setRespondedTo] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(false);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const router = useRouter();

  useEffect(() => {
    if (activeTab === "donate") {
      fetchBloodNeeds();
    }
  }, [activeTab]);

  const fetchBloodNeeds = async () => {
    setLoadingNeeds(true);
    setErrorNeeds(null);

    try {
      const userIdStr = await AsyncStorage.getItem("userId");
      if (!userIdStr) {
        setErrorNeeds("Please login to view requests");
        return;
      }

      const userId = parseInt(userIdStr, 10);
      if (isNaN(userId)) {
        setErrorNeeds("Invalid session. Please login again.");
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/donate-blood/needers?currentUserId=${userId}`,
        { timeout: 10000 }
      );

      if (response.data?.success) {
        const sorted = (response.data.data || []).sort((a, b) =>
          b.requirement_status - a.requirement_status
        );
        setNeeds(sorted);
      } else {
        setErrorNeeds(response.data?.message || "Failed to load requests");
      }
    } catch (error: any) {
      console.log("Fetch needs error:", error);
      let msg = "Failed to load blood requests.";
      if (error.response?.status === 403) {
        msg = "Session expired. Please login again.";
        await AsyncStorage.multiRemove(["userId", "userToken"]);
        router.replace("/login");
      } else if (error.request) {
        msg = "Cannot connect to server. Check internet or backend.";
      }
      setErrorNeeds(msg);
    } finally {
      setLoadingNeeds(false);
    }
  };

  // ─── POST REQUIREMENT SUBMIT FUNCTION (this was missing) ───
  const handleSubmit = async () => {
    // Validation
    if (!form.requesterName.trim()) {
      Alert.alert("Required", "Please enter patient/organizer name");
      return;
    }
    if (!form.contactPerson.trim()) {
      Alert.alert("Required", "Please enter contact person name");
      return;
    }
    if (!form.contactPhone.trim() || form.contactPhone.length < 10) {
      Alert.alert("Required", "Please enter a valid phone number");
      return;
    }
    if (!acceptAny && !form.bloodGroup) {
      Alert.alert("Required", "Please select a blood group or enable 'Accept Any Blood Group'");
      return;
    }
    if (!form.units.trim() || isNaN(Number(form.units)) || Number(form.units) < 1) {
      Alert.alert("Required", "Please enter a valid number of units");
      return;
    }

    if (requestType === "patient") {
      if (!form.hospitalName.trim()) {
        Alert.alert("Required", "Please enter hospital name");
        return;
      }
      if (!form.requiredByDate.trim()) {
        Alert.alert("Required", "Please enter required by date");
        return;
      }
    }

    if (requestType === "organization") {
      if (!form.campName.trim()) {
        Alert.alert("Required", "Please enter camp/event name");
        return;
      }
      if (!form.campVenue.trim()) {
        Alert.alert("Required", "Please enter venue/location");
        return;
      }
      if (!form.campDate.trim()) {
        Alert.alert("Required", "Please enter camp date");
        return;
      }
    }

    setLoading(true);

    try {
      const userIdStr = await AsyncStorage.getItem("userId");
      const token = await AsyncStorage.getItem("userToken");

      if (!userIdStr) {
        Alert.alert("Session Error", "Please login again.");
        router.replace("/login");
        return;
      }

      const userId = parseInt(userIdStr, 10);
      if (isNaN(userId)) {
        Alert.alert("Error", "Invalid session.");
        return;
      }

      const payload = {
        user_id: userId,
        request_type: requestType,
        patient_organization_name: form.requesterName.trim(),
        contact_person_name: form.contactPerson.trim(),
        contact_number: form.contactPhone.trim(),
        blood_group: acceptAny ? "any" : form.bloodGroup,
        hospital_event_name:
          requestType === "patient" ? form.hospitalName.trim() : form.campName.trim(),
        location_name:
          requestType === "patient" ? form.hospitalName.trim() : form.campVenue.trim(),
        required_date:
          requestType === "patient" ? form.requiredByDate.trim() : form.campDate.trim(),
        units_required: parseInt(form.units, 10),
        additional_notes: form.additionalNotes.trim() || null,
      };

      const response = await axios.post(
        `${API_BASE_URL}/donate-blood/create`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 15000,
        }
      );

      if (response.data?.success) {
        Alert.alert("Success", "Posted successfully!", [
          { text: "OK", onPress: () => router.push("/myactivity") },
        ]);

        // Reset form
        setForm({
          requesterName: "",
          contactPerson: "",
          contactPhone: "",
          bloodGroup: "",
          units: "",
          additionalNotes: "",
          hospitalName: "",
          requiredByDate: "",
          campName: "",
          campVenue: "",
          campDate: "",
        });
        setAcceptAny(false);

        // Refresh list if in "Needers" tab
        if (activeTab === "donate") fetchBloodNeeds();
      } else {
        Alert.alert("Error", response.data?.message || "Failed to post");
      }
    } catch (error: any) {
      let msg = "Something went wrong.";
      if (error.response?.status === 403) {
        msg = "Session expired. Login again.";
        await AsyncStorage.multiRemove(["userId", "userToken"]);
        router.replace("/login");
      }
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceResponse = async (item: BloodNeed) => {
    Alert.alert(
      "Confirm Response",
      `Do you want to respond to this blood requirement?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Respond",
          onPress: async () => {
            try {
              const userIdStr = await AsyncStorage.getItem("userId");
              if (!userIdStr) throw new Error("Not logged in");

              const userId = parseInt(userIdStr, 10);

              await axios.post(
                `${API_BASE_URL}/donate-blood/responses/place?currentUserId=${userId}`,
                {
                  blood_requirement_id: item.blood_requirement_id,
                  // remarks: "I can donate tomorrow", // optional
                },
                { timeout: 10000 }
              );

              setRespondedTo((prev) => {
                const newSet = new Set(prev);
                newSet.add(item.blood_requirement_id);
                return newSet;
              });

              Alert.alert("Success", "Your response has been recorded!");
            } catch (err: any) {
              let msg = "Failed to place response.";
              if (err.response?.status === 409) {
                msg = "You have already responded to this request.";
              } else if (err.response?.status === 404) {
                msg = "This request is no longer active.";
              }
              Alert.alert("Error", msg);
            }
          },
        },
      ]
    );
  };

  const maskPhone = (phone: string) => {
    if (phone.length <= 4) return phone;
    return "x".repeat(phone.length - 4) + phone.slice(-4);
  };

  const renderNeedCard = ({ item }: { item: BloodNeed }) => {
    const isOrg = item.request_type === "organization";
    const name = isOrg ? item.organization_name : item.patient_name;
    const place = isOrg ? item.event_name : item.hospital_name;
    const blood = item.blood_group === "any" ? "Any" : item.blood_group;

    const isActive = item.requirement_status_name === "Active";
    const hasResponded = respondedTo.has(item.blood_requirement_id);

    const displayedPhone = hasResponded
      ? item.contact_number
      : maskPhone(item.contact_number);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text
            style={[
              styles.statusBadge,
              isActive ? styles.statusActive : styles.statusInactive,
            ]}
          >
            {item.requirement_status_name}
          </Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.label}>{isOrg ? "Organization" : "Patient"}:</Text>
          <Text style={styles.value}>{name || "N/A"}</Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.label}>{isOrg ? "Event" : "Hospital"}:</Text>
          <Text style={styles.value}>{place || "N/A"}</Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.label}>Blood Group:</Text>
          <Text style={[styles.value, { color: "#c62828", fontWeight: "bold" }]}>
            {blood}
          </Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.label}>Units Required:</Text>
          <Text style={styles.value}>{item.units_required}</Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.label}>Contact Person:</Text>
          <Text style={styles.value}>{item.contact_person_name}</Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.label}>Phone:</Text>
          <Text style={[styles.value, { color: "#1976d2" }]}>
            {displayedPhone}
          </Text>
        </View>

        <View style={styles.cardRow}>
          <Text style={styles.label}>Posted by:</Text>
          <Text style={styles.value}>@{item.request_username}</Text>
        </View>

        {isActive && !hasResponded && (
          <TouchableOpacity
            style={styles.responseButton}
            onPress={() => handlePlaceResponse(item)}
          >
            <Text style={styles.responseButtonText}>Place Response</Text>
          </TouchableOpacity>
        )}

        {hasResponded && (
          <Text style={styles.respondedNote}>
            You have already responded — contact visible
          </Text>
        )}
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Header showEmergency />

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "donate" && styles.tabActive]}
            onPress={() => setActiveTab("donate")}
          >
            <Text style={[styles.tabText, activeTab === "donate" && styles.tabTextActive]}>
              Needers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "request" && styles.tabActive]}
            onPress={() => setActiveTab("request")}
          >
            <Text style={[styles.tabText, activeTab === "request" && styles.tabTextActive]}>
              Post Requirement
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "donate" ? (
          <View style={{ flex: 1 }}>
            {loadingNeeds ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#c62828" />
                <Text style={{ marginTop: 12, color: "#555" }}>
                  Loading requests...
                </Text>
              </View>
            ) : errorNeeds ? (
              <View style={styles.center}>
                <Text style={{ color: "red", textAlign: "center" }}>{errorNeeds}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchBloodNeeds}>
                  <Text style={{ color: "#fff" }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : needs.length === 0 ? (
              <View style={styles.center}>
                <Text style={{ color: "#777", fontSize: 16 }}>
                  No active requests found
                </Text>
              </View>
            ) : (
              <FlatList
                data={needs}
                renderItem={renderNeedCard}
                keyExtractor={(item) => item.blood_requirement_id.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        ) : (
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.formTitle}>Post Blood Requirement</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Request Type</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[styles.segmentButton, requestType === "patient" && styles.segmentActive]}
                  onPress={() => setRequestType("patient")}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      requestType === "patient" && styles.segmentTextActive,
                    ]}
                  >
                    Patient
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    requestType === "organization" && styles.segmentActive,
                  ]}
                  onPress={() => setRequestType("organization")}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      requestType === "organization" && styles.segmentTextActive,
                    ]}
                  >
                    Organization
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {requestType === "patient" ? "Patient Name" : "Organizer / Responsible Person"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={
                  requestType === "patient"
                    ? "Full name of the patient"
                    : "Name of organizer / responsible person"
                }
                value={form.requesterName}
                onChangeText={(text) => setForm({ ...form, requesterName: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Person Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Name of person to coordinate"
                value={form.contactPerson}
                onChangeText={(t) => setForm({ ...form, contactPerson: t })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 ___________"
                keyboardType="phone-pad"
                maxLength={15}
                value={form.contactPhone}
                onChangeText={(t) => setForm({ ...form, contactPhone: t })}
              />
            </View>

            {requestType === "organization" && (
              <>
                <View style={styles.inputGroup}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={styles.inputLabel}>Accept Any Blood Group</Text>
                    <Switch
                      value={acceptAny}
                      onValueChange={setAcceptAny}
                      trackColor={{ false: "#767577", true: "#c62828" }}
                      thumbColor={acceptAny ? "#f8f9fa" : "#f4f3f4"}
                    />
                  </View>
                </View>

                {!acceptAny && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Blood Group Required</Text>
                    <View style={styles.bloodGroupContainer}>
                      {bloodGroups.map((group) => (
                        <TouchableOpacity
                          key={group}
                          style={[
                            styles.bloodGroupButton,
                            form.bloodGroup === group && styles.bloodGroupSelected,
                          ]}
                          onPress={() => setForm({ ...form, bloodGroup: group })}
                        >
                          <Text
                            style={[
                              styles.bloodGroupText,
                              form.bloodGroup === group && { color: "#fff" },
                            ]}
                          >
                            {group}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {requestType === "patient" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hospital Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. AIIMS Delhi, Fortis Gurgaon"
                    value={form.hospitalName}
                    onChangeText={(t) => setForm({ ...form, hospitalName: t })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Required By</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY or Immediate"
                    value={form.requiredByDate}
                    onChangeText={(t) => setForm({ ...form, requiredByDate: t })}
                  />
                </View>
              </>
            )}

            {requestType === "organization" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Camp / Event Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mega Blood Donation Camp 2026"
                    value={form.campName}
                    onChangeText={(t) => setForm({ ...form, campName: t })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Venue / Location</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Community Center, Noida Sector 18"
                    value={form.campVenue}
                    onChangeText={(t) => setForm({ ...form, campVenue: t })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Camp / Event Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    value={form.campDate}
                    onChangeText={(t) => setForm({ ...form, campDate: t })}
                  />
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {requestType === "patient" ? "Units Required" : "Target Units / Goal"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5, 25, 100"
                keyboardType="number-pad"
                value={form.units}
                onChangeText={(t) => setForm({ ...form, units: t })}
              />
              <Text style={styles.smallHelpText}>
                {requestType === "patient"
                  ? "Units needed right now"
                  : "How many units do you aim to collect?"}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Notes / Instructions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special requirements, preferred time, donor instructions, etc."
                multiline
                numberOfLines={4}
                value={form.additionalNotes}
                onChangeText={(t) => setForm({ ...form, additionalNotes: t })}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Posting..." : "Post Requirement"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.myActivityLink}
              onPress={() => router.push("/myactivity")}
            >
              <Text style={styles.myActivityLinkText}>
                View My Requests & Donor Responses →
              </Text>
            </TouchableOpacity>

            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  tabContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#fff",
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { backgroundColor: "#c62828" },
  tabText: { fontSize: 16, fontWeight: "600", color: "#333" },
  tabTextActive: { color: "#fff" },

  listContent: { paddingHorizontal: 16, paddingBottom: 80 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
    alignItems: "flex-start",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  statusActive: { backgroundColor: "#2e7d32" },
  statusInactive: { backgroundColor: "#757575" },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  label: { color: "#555", fontSize: 14, flex: 1 },
  value: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111",
    flex: 1.5,
    textAlign: "right",
  },

  responseButton: {
    backgroundColor: "#1976d2",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  responseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  respondedNote: {
    marginTop: 12,
    color: "#2e7d32",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
  },

  retryBtn: {
    marginTop: 20,
    backgroundColor: "#c62828",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },

  // Form styles
  formContainer: { flex: 1, paddingHorizontal: 20 },
  formTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#b71c1c",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 15, color: "#333", marginBottom: 8, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  smallHelpText: { fontSize: 13, color: "#777", marginTop: 6 },

  segmentedControl: {
    flexDirection: "row",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#c62828",
  },
  segmentButton: { flex: 1, paddingVertical: 14, alignItems: "center", backgroundColor: "#fff" },
  segmentActive: { backgroundColor: "#c62828" },
  segmentText: { fontSize: 15, fontWeight: "600", color: "#c62828" },
  segmentTextActive: { color: "#fff" },

  bloodGroupContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bloodGroupButton: {
    borderWidth: 1.5,
    borderColor: "#c62828",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 65,
    alignItems: "center",
  },
  bloodGroupSelected: { backgroundColor: "#c62828" },
  bloodGroupText: { color: "#c62828", fontWeight: "700", fontSize: 15 },

  submitButton: {
    backgroundColor: "#c62828",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  myActivityLink: { paddingVertical: 12, alignItems: "center", marginTop: 8 },
  myActivityLinkText: { color: "#1976d2", fontSize: 15, fontWeight: "600" },
});