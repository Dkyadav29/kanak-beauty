import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@/services';
import type { CourseFilters } from '@/types';
import { queryKeys } from './queryKeys';

export const useCourses = (filters: CourseFilters & { featured?: boolean } = {}) =>
  useQuery({ queryKey: queryKeys.catalog.courses(filters), queryFn: () => catalogService.listCourses(filters), staleTime: 60_000 });

export const useCourse = (idOrSlug: string | undefined) =>
  useQuery({ queryKey: queryKeys.catalog.course(idOrSlug ?? ''), queryFn: () => catalogService.getCourse(idOrSlug!), enabled: !!idOrSlug, staleTime: 60_000 });

export const useCourseSessions = (idOrSlug: string | undefined) =>
  useQuery({
    queryKey: queryKeys.catalog.courseSessions(idOrSlug ?? ''),
    queryFn: () => catalogService.getCourseSessions(idOrSlug!),
    enabled: !!idOrSlug,
  });

export const useUpcomingSessions = (limit = 8) =>
  useQuery({ queryKey: queryKeys.catalog.upcoming(limit), queryFn: () => catalogService.upcomingSessions(limit), staleTime: 60_000 });

export const useTrainers = () => useQuery({ queryKey: queryKeys.catalog.trainers, queryFn: catalogService.trainers, staleTime: 5 * 60_000 });

export const useAcademyStats = () => useQuery({ queryKey: queryKeys.catalog.stats, queryFn: catalogService.stats, staleTime: 5 * 60_000 });

export const useValidateReferral = (code: string | undefined) =>
  useQuery({
    queryKey: queryKeys.catalog.referralCode(code ?? ''),
    queryFn: () => catalogService.validateReferral(code!),
    enabled: !!code && code.trim().length >= 4,
    retry: false,
    staleTime: 60_000,
  });

export const useVerifyCertificate = (number: string | undefined) =>
  useQuery({
    queryKey: queryKeys.catalog.verify(number ?? ''),
    queryFn: () => catalogService.verifyCertificate(number!),
    enabled: !!number,
    retry: false,
  });
