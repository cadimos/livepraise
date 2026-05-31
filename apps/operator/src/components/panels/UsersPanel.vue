<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchJson } from '../../composables/useApi';

type UserRole = 'operator' | 'remote' | 'admin';

interface PublicUser {
  id: number;
  username: string;
  role: UserRole;
  active: boolean;
}

const { t } = useI18n();

const users = ref<PublicUser[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const message = ref('');

const newUsername = ref('');
const newPassword = ref('');
const newRole = ref<UserRole>('remote');

const editingId = ref<number | null>(null);
const editPassword = ref('');
const editRole = ref<UserRole>('remote');
const editActive = ref(true);

async function loadUsers() {
  loading.value = true;
  error.value = '';
  try {
    const data = await fetchJson<{ status: string; users: PublicUser[] }>('/api/users');
    users.value = data.users ?? [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('settings.users.errors.load');
  } finally {
    loading.value = false;
  }
}

function startEdit(user: PublicUser) {
  editingId.value = user.id;
  editPassword.value = '';
  editRole.value = user.role;
  editActive.value = user.active;
  message.value = '';
  error.value = '';
}

function cancelEdit() {
  editingId.value = null;
}

async function createUser() {
  const username = newUsername.value.trim();
  const password = newPassword.value;
  if (!username || !password) {
    error.value = t('settings.users.errors.required');
    return;
  }

  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    await fetchJson('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        role: newRole.value,
      }),
    });
    newUsername.value = '';
    newPassword.value = '';
    newRole.value = 'remote';
    message.value = t('settings.users.created');
    await loadUsers();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('settings.users.errors.save');
  } finally {
    saving.value = false;
  }
}

async function saveEdit() {
  if (editingId.value === null) return;

  saving.value = true;
  error.value = '';
  message.value = '';
  try {
    const body: Record<string, unknown> = {
      role: editRole.value,
      active: editActive.value,
    };
    if (editPassword.value) body.password = editPassword.value;

    await fetchJson(`/api/users/${editingId.value}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    message.value = t('settings.users.updated');
    editingId.value = null;
    await loadUsers();
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('settings.users.errors.save');
  } finally {
    saving.value = false;
  }
}

function roleLabel(role: UserRole): string {
  return t(`settings.users.roles.${role}`);
}

onMounted(() => {
  void loadUsers();
});
</script>

<template>
  <div class="flex flex-col gap-4 text-sm">
    <p class="text-lp-muted">{{ t('settings.users.intro') }}</p>

    <p v-if="error" class="rounded bg-rose-900/40 px-3 py-2 text-rose-200">{{ error }}</p>
    <p v-if="message" class="rounded bg-emerald-900/40 px-3 py-2 text-emerald-200">
      {{ message }}
    </p>

    <div v-if="loading" class="text-lp-muted">{{ t('common.loading') }}</div>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="user in users"
        :key="user.id"
        class="rounded-lg border border-lp-surface bg-lp-surface/40 px-3 py-2"
      >
        <template v-if="editingId === user.id">
          <div class="flex flex-col gap-2">
            <p class="font-medium text-lp-text">{{ user.username }}</p>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-lp-muted">{{ t('settings.users.newPassword') }}</span>
              <input
                v-model="editPassword"
                type="password"
                class="rounded border border-lp-surface bg-lp-background px-2 py-1 text-lp-text"
                :placeholder="t('settings.users.passwordOptional')"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-lp-muted">{{ t('settings.users.role') }}</span>
              <select
                v-model="editRole"
                class="rounded border border-lp-surface bg-lp-background px-2 py-1 text-lp-text"
              >
                <option value="admin">{{ roleLabel('admin') }}</option>
                <option value="operator">{{ roleLabel('operator') }}</option>
                <option value="remote">{{ roleLabel('remote') }}</option>
              </select>
            </label>
            <label class="inline-flex items-center gap-2">
              <input v-model="editActive" type="checkbox" />
              <span>{{ t('settings.users.active') }}</span>
            </label>
            <span class="flex gap-2">
              <button
                type="button"
                class="rounded bg-lp-primary px-3 py-1 text-white disabled:opacity-50"
                :disabled="saving"
                @click="saveEdit"
              >
                {{ saving ? t('settings.users.saving') : t('settings.users.save') }}
              </button>
              <button
                type="button"
                class="rounded border border-lp-surface px-3 py-1"
                @click="cancelEdit"
              >
                {{ t('settings.users.cancel') }}
              </button>
            </span>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong class="text-lp-text">{{ user.username }}</strong>
              <span class="text-lp-muted">
                — {{ roleLabel(user.role) }}
                <span v-if="!user.active">({{ t('settings.users.inactive') }})</span>
              </span>
            </span>
            <button
              type="button"
              class="rounded border border-lp-surface px-2 py-1 text-xs hover:bg-lp-surface"
              @click="startEdit(user)"
            >
              {{ t('settings.users.edit') }}
            </button>
          </div>
        </template>
      </li>
      <li v-if="!users.length" class="text-lp-muted">{{ t('settings.users.empty') }}</li>
    </ul>

    <section class="border-t border-lp-surface pt-4">
      <h3 class="mb-2 font-semibold text-lp-text">{{ t('settings.users.createTitle') }}</h3>
      <form class="flex flex-col gap-2" @submit.prevent="createUser">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-lp-muted">{{ t('settings.users.username') }}</span>
          <input
            v-model="newUsername"
            type="text"
            required
            autocomplete="off"
            class="rounded border border-lp-surface bg-lp-background px-2 py-1 text-lp-text"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-lp-muted">{{ t('settings.users.password') }}</span>
          <input
            v-model="newPassword"
            type="password"
            required
            autocomplete="new-password"
            class="rounded border border-lp-surface bg-lp-background px-2 py-1 text-lp-text"
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-lp-muted">{{ t('settings.users.role') }}</span>
          <select
            v-model="newRole"
            class="rounded border border-lp-surface bg-lp-background px-2 py-1 text-lp-text"
          >
            <option value="admin">{{ roleLabel('admin') }}</option>
            <option value="operator">{{ roleLabel('operator') }}</option>
            <option value="remote">{{ roleLabel('remote') }}</option>
          </select>
        </label>
        <button
          type="submit"
          class="mt-1 w-fit rounded bg-lp-primary px-4 py-2 text-white disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? t('settings.users.saving') : t('settings.users.create') }}
        </button>
      </form>
    </section>
  </div>
</template>
