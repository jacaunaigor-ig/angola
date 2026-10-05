import * as BackgroundFetch from 'expo-background-fetch';
import * as Network from 'expo-network';
import * as TaskManager from 'expo-task-manager';

import { apiService } from './api';

export const BACKGROUND_SYNC_TASK = 'angola-field-queue-sync';

if (!TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)) {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      const network = await Network.getNetworkStateAsync();
      if (!network.isConnected || network.isInternetReachable === false) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
      const result = await apiService.sincronizarFilaOffline();
      return result.sucesso
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.Failed;
    } catch (error) {
      console.error('[BackgroundSync] Falha ao sincronizar fila local:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerBackgroundSync() {
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  if (alreadyRegistered) return;
  const status = await BackgroundFetch.getStatusAsync();
  if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
    throw new Error('Sincronização em segundo plano não está disponível neste dispositivo.');
  }
  await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 15 * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
