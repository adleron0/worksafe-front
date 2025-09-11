import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/student/course/$courseId/')({
  component: CourseIndex,
});

function CourseIndex() {
  const navigate = useNavigate();
  const { courseId } = Route.useParams();
  
  // Redirecionar automaticamente para /lessons
  useEffect(() => {
    navigate({ 
      to: '/student/course/$courseId/lessons',
      params: { courseId }
    });
  }, [courseId, navigate]);
  
  return null;
}