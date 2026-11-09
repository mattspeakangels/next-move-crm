import { InteractionRequiredAuthError, PublicClientApplication, type AccountInfo } from '@azure/msal-browser';

export interface OutlookMessage {
  id: string;
  subject?: string;
  receivedDateTime?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
}

const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined;
const scopes = ['Mail.ReadBasic'];
let client: PublicClientApplication | undefined;

export const outlookConfigured = Boolean(clientId?.trim());

async function getClient() {
  if (!clientId?.trim()) throw new Error('Configurazione Microsoft mancante: serve un Application (client) ID autorizzato.');
  if (!client) {
    client = new PublicClientApplication({
      auth: { clientId: clientId.trim(), authority: 'https://login.microsoftonline.com/organizations', redirectUri: window.location.origin },
      cache: { cacheLocation: 'memoryStorage' },
    });
    await client.initialize();
  }
  return client;
}

export async function connectOutlook(): Promise<AccountInfo> {
  const msal = await getClient();
  const result = await msal.loginPopup({ scopes, prompt: 'select_account' });
  if (!result.account) throw new Error('Microsoft non ha restituito un account.');
  return result.account;
}

export async function fetchOutlookMessages(account: AccountInfo): Promise<OutlookMessage[]> {
  const msal = await getClient();
  let token;
  try {
    token = await msal.acquireTokenSilent({ account, scopes });
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) throw error;
    token = await msal.acquireTokenPopup({ account, scopes });
  }
  const params = new URLSearchParams({ '$top': '20', '$select': 'id,subject,from,receivedDateTime', '$orderby': 'receivedDateTime desc' });
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${params}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!response.ok) throw new Error(`Microsoft Graph ha rifiutato la lettura (HTTP ${response.status}). Verifica il consenso e le policy aziendali.`);
  const data: { value?: OutlookMessage[] } = await response.json();
  return data.value ?? [];
}

export async function disconnectOutlook(account: AccountInfo): Promise<void> {
  const msal = await getClient();
  await msal.clearCache({ account });
}
