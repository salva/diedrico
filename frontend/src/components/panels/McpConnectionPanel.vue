<template>
  <aside class="mcp-panel">
    <header class="mcp-header">
      <h2 class="mcp-title">OpenCode MCP</h2>
      <span class="mcp-state" :data-state="snapshot.state">{{ snapshot.state }}</span>
    </header>

    <label class="mcp-field">
      <span>runtime</span>
      <input v-model="endpoint" type="text" spellcheck="false" placeholder="http://127.0.0.1:49374" />
    </label>
    <label class="mcp-field">
      <span>location</span>
      <input v-model="directory" type="text" spellcheck="false" placeholder="/path/to/project" />
    </label>
    <label class="mcp-field">
      <span>ticket</span>
      <input v-model="ticket" type="password" spellcheck="false" autocomplete="off" />
    </label>

    <div class="mcp-actions">
      <button type="button" :disabled="!canConnect" @click="connect">Connect</button>
      <button type="button" :disabled="snapshot.state === 'idle'" @click="disconnect">Disconnect</button>
      <span class="mcp-client">{{ clientName }}</span>
    </div>

    <p class="mcp-detail" data-testid="mcp-detail">
      {{ snapshot.detail }}<template v-if="snapshot.protocolVersion"> · MCP {{ snapshot.protocolVersion }}</template>
      · calls {{ snapshot.callCount }}
    </p>
    <ul v-if="snapshot.recentCalls.length" class="mcp-calls">
      <li v-for="(call, index) in snapshot.recentCalls" :key="index" :data-ok="call.ok">
        {{ call.tool }}{{ call.ok ? '' : ' (error)' }}
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { createBrowserMcpConnection } from '@/infrastructure/mcp/BrowserMcpConnection';
import { createHelloMcpToolCatalog } from '@/application/mcp/McpToolCatalog';

const ENDPOINT_KEY = 'diedrico.mcp.endpoint';
const DIRECTORY_KEY = 'diedrico.mcp.directory';

const connection = createBrowserMcpConnection({ catalog: createHelloMcpToolCatalog() });
const snapshot = ref(connection.snapshot());
const stopListening = connection.subscribe(() => {
  snapshot.value = connection.snapshot();
});
onUnmounted(stopListening);

const endpoint = ref(window.localStorage.getItem(ENDPOINT_KEY) ?? 'http://127.0.0.1:49374');
const directory = ref(window.localStorage.getItem(DIRECTORY_KEY) ?? '');
const ticket = ref('');
const clientName = `diedrico_${Math.random().toString(36).slice(2, 8)}`;

const canConnect = computed(() => Boolean(endpoint.value.trim() && directory.value.trim() && ticket.value.trim()));

function connect(): void {
  window.localStorage.setItem(ENDPOINT_KEY, endpoint.value.trim());
  window.localStorage.setItem(DIRECTORY_KEY, directory.value.trim());
  connection.connect({
    endpoint: endpoint.value.trim(),
    clientName,
    directory: directory.value.trim(),
    ticket: ticket.value.trim(),
  });
}

function disconnect(): void {
  connection.disconnect();
  ticket.value = '';
}
</script>

<style scoped>
.mcp-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid #d8dde3;
  background-color: #f2f4f7;
  font-size: 12px;
}
.mcp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mcp-title {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6a737d;
}
.mcp-state {
  padding: 1px 6px;
  border: 1px solid #c9d0d8;
  border-radius: 999px;
  font-size: 11px;
  color: #6a737d;
}
.mcp-state[data-state='open'] {
  color: #1a7f37;
  border-color: #1a7f37;
}
.mcp-state[data-state='error'],
.mcp-state[data-state='closed'] {
  color: #c4292e;
  border-color: #c4292e;
}
.mcp-field {
  display: grid;
  grid-template-columns: 58px 1fr;
  align-items: center;
  gap: 6px;
}
.mcp-field span {
  color: #6a737d;
}
.mcp-field input {
  min-width: 0;
  padding: 3px 6px;
  border: 1px solid #c9d0d8;
  border-radius: 4px;
  font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
  background-color: #fff;
}
.mcp-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mcp-actions button {
  padding: 3px 8px;
  border: 1px solid #2f6fde;
  border-radius: 4px;
  background-color: #2f6fde;
  color: #fff;
  font: inherit;
  cursor: pointer;
}
.mcp-actions button + button {
  border-color: #c9d0d8;
  background-color: transparent;
  color: #1f2328;
}
.mcp-actions button:disabled {
  opacity: 0.45;
  cursor: default;
}
.mcp-client {
  margin-left: auto;
  font: 10px ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #6a737d;
}
.mcp-detail {
  margin: 0;
  color: #6a737d;
}
.mcp-calls {
  margin: 0;
  padding-left: 16px;
  font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
}
.mcp-calls li[data-ok='false'] {
  color: #c4292e;
}
</style>
