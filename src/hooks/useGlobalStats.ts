import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';

interface GlobalStats {
  totalPromptsGenerated: number;
}

export const useGlobalStats = (pollingInterval?: number) => {
  return useQuery<GlobalStats>({
    queryKey: ['globalStats'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/prompts/stats/global');
      return data;
    },
    refetchInterval: pollingInterval,
  });
};
