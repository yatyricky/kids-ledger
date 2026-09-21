<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, setAuth } from '../api.js';

const router = useRouter();
const token = ref('');
const error = ref('');
const loading = ref(false);

async function login() {
  if (!token.value.trim() || loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    const { role, label } = await api('/login', { method: 'POST', body: { token: token.value.trim() } });
    setAuth(token.value.trim(), role, label);
    router.push('/ledgers');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>家庭账本</h1>
      <p class="hint">请输入口令登录</p>
      <input
        v-model="token"
        type="password"
        placeholder="口令"
        autocapitalize="off"
        autocomplete="off"
        @keyup.enter="login"
      />
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn login-btn" :disabled="loading || !token.trim()" @click="login">
        {{ loading ? '登录中…' : '登 录' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(165deg, #f0f4fb 0%, #e8ecf7 55%, #ece9f7 100%);
}
.login-card {
  background: #fff;
  border-radius: 24px;
  padding: 36px 28px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 16px 44px rgba(60, 70, 110, 0.16);
  text-align: center;
}
h1 {
  margin: 0 0 6px;
  font-size: 26px;
  color: #2f3a52;
}
.hint {
  margin: 0 0 22px;
  font-size: 14px;
  color: #8593a8;
}
input {
  width: 100%;
  padding: 13px 14px;
  border: 1.5px solid #d9dbe3;
  border-radius: 12px;
  outline: none;
  text-align: center;
  letter-spacing: 0.08em;
  transition: border-color 0.15s ease;
}
input:focus {
  border-color: #4c688f;
}
.error {
  margin: 12px 0 0;
  font-size: 13px;
  color: #b3372e;
}
.login-btn {
  margin-top: 20px;
  width: 100%;
  padding: 13px;
  font-size: 16px;
  background: #4c688f;
}
</style>
