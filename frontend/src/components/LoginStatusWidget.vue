<!--
  T404-T405: LoginStatusWidget - Display Google Drive authentication status
  
  Shows either "Sign in" button or user profile (avatar + name + dropdown).
  Responsive behavior: full name → first name → avatar only.
  
  @see specs/001-dihedral-learning-mvp/ui-spec.md - Google Drive Login Status Widget
-->
<template>
  <div class="login-status-widget">
    <!-- Unauthenticated state: Sign in button -->
    <button
      v-if="!authStore.isAuthenticated.value"
      class="sign-in-button"
      @click="$emit('sign-in')"
      title="Sign in with Google"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
        <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
        <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z" fill="#FBBC05"/>
        <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
      </svg>
      <span class="sign-in-text">Sign in</span>
    </button>

    <!-- Authenticated state: User profile with dropdown -->
    <div v-else class="user-profile" @click="toggleDropdown" ref="profileRef">
      <!-- Avatar -->
      <img
        v-if="authStore.user.value?.picture"
        :src="authStore.user.value.picture"
        :alt="authStore.user.value.name"
        class="user-avatar"
      />
      <div v-else class="user-avatar-placeholder">
        {{ getInitials(authStore.user.value?.name || '') }}
      </div>

      <!-- Name (responsive) -->
      <span class="user-name user-name-full">{{ authStore.user.value?.name }}</span>
      <span class="user-name user-name-first">{{ getFirstName(authStore.user.value?.name || '') }}</span>

      <!-- Dropdown indicator -->
      <svg class="dropdown-icon" width="12" height="12" viewBox="0 0 12 12">
        <path d="M 3 5 L 6 8 L 9 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>

      <!-- Dropdown menu -->
      <div v-if="showDropdown" class="dropdown-menu">
        <div class="dropdown-header">
          <div class="dropdown-name">{{ authStore.user.value?.name }}</div>
          <div class="dropdown-email">{{ authStore.user.value?.email }}</div>
        </div>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" @click.stop="handleSignOut">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M 6 3 L 6 5 L 10 5 L 10 11 L 6 11 L 6 13 L 12 13 L 12 3 Z M 3 7 L 8 7 M 8 7 L 6 5 M 8 7 L 6 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>Sign out</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/authStore';

const authStore = useAuthStore();

// Dropdown state
const showDropdown = ref(false);
const profileRef = ref<HTMLElement | null>(null);

// Event emitters
const emit = defineEmits<{
  'sign-in': [];
  'sign-out': [];
}>();

/**
 * Toggle dropdown menu
 */
function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

/**
 * Handle sign out click
 */
function handleSignOut() {
  showDropdown.value = false;
  emit('sign-out');
}

/**
 * Get initials from name for avatar placeholder
 */
function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get first name from full name
 */
function getFirstName(name: string): string {
  return name.split(' ')[0] || name;
}

/**
 * Close dropdown when clicking outside
 */
function handleClickOutside(event: MouseEvent) {
  if (profileRef.value && !profileRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.login-status-widget {
  display: flex;
  align-items: center;
  margin-left: auto; /* Push to far right */
  padding-left: 1rem;
}

/* Sign in button */
.sign-in-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  color: #444;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.sign-in-button:hover {
  background: #f8f9fa;
  border-color: #ccc;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sign-in-button:active {
  transform: translateY(1px);
}

/* User profile */
.user-profile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-profile:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Avatar */
.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #4285f4;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

/* User name - T405: Responsive behavior */
.user-name {
  color: white;
  font-size: 14px;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-name-first {
  display: none;
}

/* Responsive: show first name only on medium screens */
@media (max-width: 900px) {
  .user-name-full {
    display: none;
  }
  .user-name-first {
    display: block;
  }
}

/* Responsive: hide name on narrow screens */
@media (max-width: 700px) {
  .user-name {
    display: none;
  }
  .sign-in-text {
    display: none;
  }
}

/* Dropdown icon */
.dropdown-icon {
  color: white;
  opacity: 0.7;
  transition: transform 0.2s;
}

.user-profile:hover .dropdown-icon {
  opacity: 1;
}

/* Dropdown menu */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 240px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  padding: 1rem;
  background: #f8f9fa;
}

.dropdown-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.dropdown-email {
  font-size: 12px;
  color: #666;
}

.dropdown-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: white;
  border: none;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-item svg {
  color: #666;
}
</style>
