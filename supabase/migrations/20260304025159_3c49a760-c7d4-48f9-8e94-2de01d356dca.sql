
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE
-- Drop and recreate all SELECT policies as PERMISSIVE

-- Categories
DROP POLICY "Categories viewable by everyone" ON public.categories;
CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT TO public USING (true);

DROP POLICY "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tags
DROP POLICY "Tags viewable by everyone" ON public.tags;
CREATE POLICY "Tags viewable by everyone" ON public.tags FOR SELECT TO public USING (true);

DROP POLICY "Admins can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tools
DROP POLICY "Published tools viewable by everyone" ON public.tools;
CREATE POLICY "Published tools viewable by everyone" ON public.tools FOR SELECT TO public USING (status = 'published' OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY "Admins/editors can manage tools" ON public.tools;
CREATE POLICY "Admins/editors can manage tools" ON public.tools FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY "Users can submit tools" ON public.tools;
CREATE POLICY "Users can submit tools" ON public.tools FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by AND status = 'pending_review');

-- Tool tags
DROP POLICY "Tool tags viewable by everyone" ON public.tool_tags;
CREATE POLICY "Tool tags viewable by everyone" ON public.tool_tags FOR SELECT TO public USING (true);

DROP POLICY "Admins can manage tool tags" ON public.tool_tags;
CREATE POLICY "Admins can manage tool tags" ON public.tool_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Profiles
DROP POLICY "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT TO public USING (true);

DROP POLICY "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
DROP POLICY "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reviews
DROP POLICY "Published reviews viewable" ON public.reviews;
CREATE POLICY "Published reviews viewable" ON public.reviews FOR SELECT TO public USING (status = 'published' OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Ratings
DROP POLICY "Ratings viewable by everyone" ON public.ratings;
CREATE POLICY "Ratings viewable by everyone" ON public.ratings FOR SELECT TO public USING (true);

DROP POLICY "Users can rate" ON public.ratings;
CREATE POLICY "Users can rate" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can update own rating" ON public.ratings;
CREATE POLICY "Users can update own rating" ON public.ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Comments
DROP POLICY "Comments viewable by everyone" ON public.comments;
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT TO public USING (true);

DROP POLICY "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Admins can delete comments" ON public.comments;
CREATE POLICY "Admins can delete comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Bookmarks
DROP POLICY "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Votes
DROP POLICY "Votes viewable by everyone" ON public.votes;
CREATE POLICY "Votes viewable by everyone" ON public.votes FOR SELECT TO public USING (true);

DROP POLICY "Users can vote" ON public.votes;
CREATE POLICY "Users can vote" ON public.votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can change vote" ON public.votes;
CREATE POLICY "Users can change vote" ON public.votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Users can remove vote" ON public.votes;
CREATE POLICY "Users can remove vote" ON public.votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AI Scores
DROP POLICY "AI scores viewable by everyone" ON public.ai_scores;
CREATE POLICY "AI scores viewable by everyone" ON public.ai_scores FOR SELECT TO public USING (true);

DROP POLICY "Admins can manage AI scores" ON public.ai_scores;
CREATE POLICY "Admins can manage AI scores" ON public.ai_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
