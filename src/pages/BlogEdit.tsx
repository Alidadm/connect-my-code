import { useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function BlogEdit() {
  const { blogId } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <BlogEditor blogId={blogId} />
    </MainLayout>
  );
}
