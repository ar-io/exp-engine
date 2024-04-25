/*import cron from 'node-cron';
import { checkAndProcessActivities, distributeAirdrops } from './airdropManager';

export function setupCronJobs() {
  // Daily at midnight
  cron.schedule('0 0 * * *', () => {
    console.log('Checking and processing activities...');
    checkAndProcessActivities();
  });

  // Weekly on Sunday midnight
  cron.schedule('0 0 * * 0', () => {
    console.log('Distributing airdrops...');
    distributeAirdrops();
  });
}
*/