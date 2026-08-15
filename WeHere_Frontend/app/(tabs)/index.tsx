import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import {
  Search,
  MapPin,
  BriefcaseBusiness,
  Building2,
  Handshake,
  Users,
  Globe2,
  TrendingUp,
  Wrench,
  GraduationCap,
  ChevronRight,
  Filter,
  Star,
} from 'lucide-react-native';

import Header from '../components/header';

type PartnerType =
  | 'All'
  | 'Investors'
  | 'Service Providers'
  | 'Organizations'
  | 'Professionals'
  | 'Startups';

type Collaborator = {
  id: number;
  name: string;
  title: string;
  type: Exclude<PartnerType, 'All'>;
  company: string;
  location: string;
  country: string;
  description: string;
  expertise: string[];
  verified: boolean;
  rating: number;
};

const COLLABORATORS: Collaborator[] = [
  {
    id: 1,
    name: 'Arjun Mehta',
    title: 'International Investor',
    type: 'Investors',
    company: 'Global Impact Ventures',
    location: 'Singapore',
    country: 'Singapore',
    description:
      'Interested in supporting technology-driven solutions that improve emergency response and community safety.',
    expertise: ['Impact Investment', 'Technology', 'Social Innovation'],
    verified: true,
    rating: 4.9,
  },
  {
    id: 2,
    name: 'Sofia Martinez',
    title: 'Impact Investment Partner',
    type: 'Investors',
    company: 'Global Future Capital',
    location: 'Madrid',
    country: 'Spain',
    description:
      'Works with organizations building scalable solutions for public safety, healthcare and social development.',
    expertise: ['Venture Capital', 'Healthcare', 'Social Impact'],
    verified: true,
    rating: 4.8,
  },
  {
    id: 3,
    name: 'Daniel Wong',
    title: 'Emergency Technology Consultant',
    type: 'Service Providers',
    company: 'ResponseTech Solutions',
    location: 'Hong Kong',
    country: 'Hong Kong',
    description:
      'Provides emergency communication, response-system integration and technology consulting.',
    expertise: ['Emergency Systems', 'Cloud', 'Consulting'],
    verified: true,
    rating: 4.7,
  },
  {
    id: 4,
    name: 'Priya Nair',
    title: 'Community Development Specialist',
    type: 'Professionals',
    company: 'Community Connect',
    location: 'Bengaluru',
    country: 'India',
    description:
      'Helps organizations build community-based programs and volunteer networks.',
    expertise: ['Community Development', 'Volunteers', 'NGOs'],
    verified: true,
    rating: 4.9,
  },
  {
    id: 5,
    name: 'Michael Johnson',
    title: 'Founder & Startup Advisor',
    type: 'Startups',
    company: 'ImpactBridge',
    location: 'London',
    country: 'United Kingdom',
    description:
      'Entrepreneur focused on technology platforms that connect communities with essential services.',
    expertise: ['Startups', 'Product Strategy', 'Fundraising'],
    verified: true,
    rating: 4.8,
  },
  {
    id: 6,
    name: 'Amina Hassan',
    title: 'International NGO Coordinator',
    type: 'Organizations',
    company: 'Global Relief Network',
    location: 'Nairobi',
    country: 'Kenya',
    description:
      'Coordinates humanitarian partnerships and emergency-response programs across multiple regions.',
    expertise: ['Humanitarian Aid', 'Emergency Response', 'Partnerships'],
    verified: true,
    rating: 4.9,
  },
  {
    id: 7,
    name: 'Lucas Silva',
    title: 'Emergency Logistics Provider',
    type: 'Service Providers',
    company: 'RapidAssist Global',
    location: 'São Paulo',
    country: 'Brazil',
    description:
      'Provides logistics and operational support for emergency-response organizations.',
    expertise: ['Logistics', 'Emergency Operations', 'Transportation'],
    verified: true,
    rating: 4.6,
  },
  {
    id: 8,
    name: 'Emma Wilson',
    title: 'Technology Partnerships Manager',
    type: 'Professionals',
    company: 'SafeWorld Technologies',
    location: 'Toronto',
    country: 'Canada',
    description:
      'Builds partnerships between technology companies and organizations working on public safety.',
    expertise: ['Partnerships', 'Technology', 'Public Safety'],
    verified: true,
    rating: 4.8,
  },
];

const FILTERS: PartnerType[] = [
  'All',
  'Investors',
  'Service Providers',
  'Organizations',
  'Professionals',
  'Startups',
];

function getTypeIcon(type: PartnerType) {
  switch (type) {
    case 'Investors':
      return TrendingUp;

    case 'Service Providers':
      return Wrench;

    case 'Organizations':
      return Building2;

    case 'Professionals':
      return GraduationCap;

    case 'Startups':
      return BriefcaseBusiness;

    default:
      return Users;
  }
}

export default function WeCollab() {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] =
    useState<PartnerType>('All');

  const filteredCollaborators = useMemo(() => {
    const query = search.trim().toLowerCase();

    return COLLABORATORS.filter((person) => {
      const matchesFilter =
        selectedFilter === 'All' ||
        person.type === selectedFilter;

      if (!matchesFilter) return false;

      if (!query) return true;

      return (
        person.name.toLowerCase().includes(query) ||
        person.title.toLowerCase().includes(query) ||
        person.company.toLowerCase().includes(query) ||
        person.location.toLowerCase().includes(query) ||
        person.country.toLowerCase().includes(query) ||
        person.expertise.some((item) =>
          item.toLowerCase().includes(query)
        )
      );
    });
  }, [search, selectedFilter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <Header />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <Handshake
                size={25}
                color="#166534"
                strokeWidth={2.3}
              />
            </View>

            <View style={styles.titleContent}>
              <Text style={styles.pageTitle}>WeCollab</Text>
              <Text style={styles.pageSubtitle}>
                Connect beyond borders
              </Text>
            </View>
          </View>

          <Text style={styles.description}>
            Discover investors, service providers, professionals,
            organizations and startups that can help turn ideas
            into meaningful collaborations.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search people, companies or expertise..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />

          <TouchableOpacity
            style={styles.filterIcon}
            activeOpacity={0.7}
          >
            <Filter size={18} color="#166534" />
          </TouchableOpacity>
        </View>

        {/* International banner */}
        <View style={styles.globalBanner}>
          <View style={styles.globalIcon}>
            <Globe2 size={25} color="#FFFFFF" />
          </View>

          <View style={styles.globalContent}>
            <Text style={styles.globalTitle}>
              Global Collaboration Network
            </Text>

            <Text style={styles.globalText}>
              Connect with people and organizations from different
              countries, industries and communities.
            </Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Explore Collaborators
            </Text>

            <Text style={styles.sectionSubtitle}>
              Find the right connection for your mission
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTERS.map((filter) => {
            const active = selectedFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  active && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.75}
              >
                {filter !== 'All' &&
                  React.createElement(
                    getTypeIcon(filter),
                    {
                      size: 15,
                      color: active ? '#FFFFFF' : '#166534',
                    }
                  )}

                {filter === 'All' && (
                  <Users
                    size={15}
                    color={active ? '#FFFFFF' : '#166534'}
                  />
                )}

                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredCollaborators.length} collaborators
          </Text>

          <Text style={styles.resultsLocation}>
            🌍 Global
          </Text>
        </View>

        {filteredCollaborators.length === 0 ? (
          <View style={styles.emptyCard}>
            <Search size={38} color="#9CA3AF" />

            <Text style={styles.emptyTitle}>
              No collaborators found
            </Text>

            <Text style={styles.emptyText}>
              Try another name, company, country or expertise.
            </Text>
          </View>
        ) : (
          filteredCollaborators.map((person) => {
            const TypeIcon = getTypeIcon(person.type);

            return (
              <TouchableOpacity
                key={person.id}
                style={styles.profileCard}
                activeOpacity={0.85}
                onPress={() => {
                  // Later this will open the collaborator profile.
                  console.log(
                    '[WeCollab] Selected:',
                    person.name
                  );
                }}
              >
                {/* Top */}
                <View style={styles.profileTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {person.name
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.profileMain}>
                    <View style={styles.nameRow}>
                      <Text
                        style={styles.profileName}
                        numberOfLines={1}
                      >
                        {person.name}
                      </Text>

                      {person.verified && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedText}>
                            ✓
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.profileTitle}>
                      {person.title}
                    </Text>

                    <Text style={styles.company}>
                      {person.company}
                    </Text>
                  </View>

                  <ChevronRight
                    size={21}
                    color="#9CA3AF"
                  />
                </View>

                {/* Type */}
                <View style={styles.typeRow}>
                  <View style={styles.typeBadge}>
                    <TypeIcon
                      size={14}
                      color="#166534"
                    />

                    <Text style={styles.typeText}>
                      {person.type}
                    </Text>
                  </View>

                  <View style={styles.rating}>
                    <Star
                      size={14}
                      color="#EAB308"
                      fill="#EAB308"
                    />

                    <Text style={styles.ratingText}>
                      {person.rating}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.locationRow}>
                  <MapPin
                    size={15}
                    color="#6B7280"
                  />

                  <Text style={styles.locationText}>
                    {person.location}, {person.country}
                  </Text>
                </View>

                {/* Description */}
                <Text
                  style={styles.profileDescription}
                  numberOfLines={3}
                >
                  {person.description}
                </Text>

                {/* Expertise */}
                <View style={styles.expertiseContainer}>
                  {person.expertise
                    .slice(0, 3)
                    .map((skill) => (
                      <View
                        key={skill}
                        style={styles.expertiseBadge}
                      >
                        <Text style={styles.expertiseText}>
                          {skill}
                        </Text>
                      </View>
                    ))}
                </View>

                {/* Connect */}
                <TouchableOpacity
                  style={styles.connectButton}
                  activeOpacity={0.8}
                  onPress={() => {
                    console.log(
                      '[WeCollab] Connect:',
                      person.name
                    );
                  }}
                >
                  <Handshake
                    size={17}
                    color="#FFFFFF"
                  />

                  <Text style={styles.connectText}>
                    Connect
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}

        {/* Future feature */}
        <View style={styles.bottomInfo}>
          <Globe2
            size={21}
            color="#166534"
          />

          <Text style={styles.bottomInfoText}>
            WeCollab is designed to connect local communities
            with global opportunities, expertise and resources.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7',
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },

  pageHeader: {
    marginBottom: 18,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleContent: {
    marginLeft: 12,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  pageSubtitle: {
    marginTop: 2,
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },

  description: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
  },

  searchContainer: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginBottom: 14,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    color: '#111827',
  },

  filterIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EAF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  globalBanner: {
    backgroundColor: '#166534',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  globalIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  globalContent: {
    flex: 1,
    marginLeft: 12,
  },

  globalTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  globalText: {
    color: '#DCFCE7',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  sectionHeader: {
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  sectionSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 3,
  },

  filterContainer: {
    paddingBottom: 7,
    paddingRight: 10,
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5DE',
    marginRight: 8,
    gap: 5,
  },

  filterButtonActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },

  filterText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
    marginBottom: 10,
  },

  resultsCount: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '800',
  },

  resultsLocation: {
    color: '#6B7280',
    fontSize: 12,
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#166534',
    fontSize: 18,
    fontWeight: '800',
  },

  profileMain: {
    flex: 1,
    marginLeft: 11,
    marginRight: 7,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    maxWidth: '85%',
  },

  verifiedBadge: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },

  verifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  profileTitle: {
    color: '#4B5563',
    fontSize: 12,
    marginTop: 2,
  },

  company: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },

  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4EC',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
  },

  typeText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
  },

  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  ratingText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '700',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
  },

  locationText: {
    color: '#6B7280',
    fontSize: 11,
    marginLeft: 5,
  },

  profileDescription: {
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },

  expertiseContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },

  expertiseBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  expertiseText: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '600',
  },

  connectButton: {
    height: 39,
    borderRadius: 10,
    backgroundColor: '#166534',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    gap: 6,
  },

  connectText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 35,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  emptyTitle: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },

  emptyText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },

  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF4EC',
    borderRadius: 14,
    padding: 13,
    marginTop: 10,
  },

  bottomInfoText: {
    flex: 1,
    color: '#166534',
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 9,
  },
});