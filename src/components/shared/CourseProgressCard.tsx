import { Link } from 'react-router-dom';
import { Award, CalendarDays, CheckCircle2, UserRound } from 'lucide-react';
import type { EnrolledCourseView } from '@/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Badge, ImageWithFallback, LinkButton, ProgressBar, StatusBadge } from '@/components/ui';

export const CourseProgressCard = ({ course }: { course: EnrolledCourseView }) => {
  const suspended = course.enrollment.accessStatus !== 'active';
  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[16/8] overflow-hidden">
        <ImageWithFallback src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" fallbackLabel={course.title} />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <StatusBadge status={course.format} className="bg-white/90" />
          {course.isCompleted ? (
            <Badge tone="success" className="bg-white/90">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
          ) : null}
          {suspended ? <StatusBadge status={course.enrollment.accessStatus} className="bg-white/90" /> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold leading-snug text-charcoal-900">{course.title}</h3>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-500">
          <li className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" /> {course.trainerName}
          </li>
          <li className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Enrolled {formatDate(course.enrollment.enrolledAt)}
          </li>
        </ul>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-charcoal-500">
            <span>
              {course.completedLessons}/{course.totalLessons} lessons
            </span>
            <span className="font-semibold text-charcoal-800">{course.progressPercent}%</span>
          </div>
          <ProgressBar value={course.progressPercent} tone={course.isCompleted ? 'success' : 'rose'} className="mt-1.5" />
        </div>
        {course.nextSessionAt ? <p className="mt-3 text-xs text-charcoal-700">Next live class: <span className="font-semibold">{formatDateTime(course.nextSessionAt)}</span></p> : null}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
          {suspended ? (
            <p className="col-span-2 text-xs text-amber-700">Access to this course is currently {course.enrollment.accessStatus}. Contact the academy for help.</p>
          ) : (
            <>
              <LinkButton to={`/student/courses/${course.courseId}/learn`} size="sm">
                {course.isCompleted ? 'Review course' : course.progressPercent > 0 ? 'Continue Learning' : 'Start Learning'}
              </LinkButton>
              <LinkButton to={`/courses/${course.courseId}`} variant="outline" size="sm">
                View Course
              </LinkButton>
            </>
          )}
          {course.certificateId ? (
            <Link to={`/student/certificates/${course.certificateId}`} className="col-span-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-gold-800 hover:underline">
              <Award className="h-3.5 w-3.5" /> View certificate
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
};
