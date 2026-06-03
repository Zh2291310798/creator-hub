-- ============================================
-- CreatorHub v2.0 Migration
-- ============================================

-- 1. 邀请码表
CREATE TABLE IF NOT EXISTS invitation_codes (
  code TEXT PRIMARY KEY,
  inviter_username TEXT NOT NULL,
  used_by TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invite_insert_auth" ON invitation_codes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "invite_select_auth" ON invitation_codes FOR SELECT USING (true);

-- 2. 评价表
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  deal_id TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  reviewee TEXT NOT NULL,
  role TEXT NOT NULL,
  ratings JSONB NOT NULL,
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, reviewer, reviewee)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_auth" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_auth" ON reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. 现有表加字段
ALTER TABLE match_demands ADD COLUMN IF NOT EXISTS deal_status TEXT DEFAULT 'open';
ALTER TABLE match_demands ADD COLUMN IF NOT EXISTS deal_partner TEXT;
ALTER TABLE match_demands ADD COLUMN IF NOT EXISTS deal_confirmed_at TIMESTAMPTZ;
ALTER TABLE match_demands ADD COLUMN IF NOT EXISTS deal_closed_at TIMESTAMPTZ;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT FALSE;
ALTER TABLE local_demands ADD COLUMN IF NOT EXISTS is_seed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS connected_platforms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platforms JSONB DEFAULT '[]'::jsonb;

-- 4. 种子内容（搬运真实公开渠道的需求）
INSERT INTO posts (id, author, author_avatar, title, category, category_label, content, platform, is_seed) VALUES
('seed-post-1', '运营小圆', '圆', '新人报道！刚毕业入行新媒体运营', 'newbie', '新人报到', '大家好我是今年的应届生，刚找到第一份新媒体运营的工作。主要做小红书方向，希望能在这里向前辈学习！目前粉丝才几百个但是每天都在涨，求指点。', 'xhs', TRUE),
('seed-post-2', '短视频老刘', '刘', '做了三年抖音剪辑，分享几个避坑经验', 'exp', '经验分享', '入行三年换了四家公司，踩过的坑数不清：1. 不要只盯着粉丝量报价，要看真实互动率。2. 品牌方说"长期合作"大概率是画饼。3. 报价要敢开，第一次报价决定了你的天花板。', 'douyin', TRUE),
('seed-post-3', 'MCN小鹿', '鹿', '【避坑】品牌方拖欠尾款怎么办？', 'qa', '求助问答', '接了一个本地探店项目，说好3000全款，现在只付了1500。合同也没签，只有微信聊天记录。请问前辈们遇到这种情况怎么处理？', 'all', TRUE),
('seed-post-4', '品牌人阿Ken', 'K', '品牌方视角：我们怎么筛选达人', 'exp', '经验分享', '做了两年品牌投放，分享一下我们在筛选达人时的真实流程：第一步看内容调性是否匹配，第二步看最近5篇的平均互动率，第三步看评论区质量（有没有真实互动），第四步才是粉丝量。粉丝量其实是最不重要的指标。', 'all', TRUE),
('seed-post-5', '自由设计师V姐', 'V', '【报价参考】2026年各平台创作者报价区间', 'guide', '干货教程', '根据我接触的上百个品牌合作案例整理的报价参考：小红书1-5万粉=300-800/篇，5-20万粉=1000-3000/篇。抖音1-10万粉=500-1500/条。B站1-5万粉=800-2000/条。注意这只是参考，具体看赛道和互动率。', 'all', TRUE),
('seed-post-6', '探店达人小李', '李', '探店新人的第一单怎么做？', 'newbie', '新人报到', '今天是做探店达人的第一个月！目前主要跑上海本地的餐饮店。想问问前辈们一开始怎么找到第一个商家的？主动私信还是等商家来找？有没有什么话术分享？', 'all', TRUE),
('seed-post-7', '小红书导师M', 'M', '小红书限流的10个自查方法（建议收藏）', 'guide', '干货教程', '做了3年小红书运营，总结笔记被限流时应该排查的10个方向：1. 检查敏感词 2. 检查图片审核状态 3. 查看账号健康分 4. 是否被举报 5. 话题标签是否违规...', 'xhs', TRUE),
('seed-post-8', '跨境出海人', '海', 'TikTok和抖音完全是两个世界——出海经验分享', 'exp', '经验分享', '在国内做了两年抖音后转做TikTok出海，文化差异、算法逻辑、爆款密码完全不一样。最大的感受：TikTok更看重真实感，国内那种精致剪辑在海外的完播率反而低。', 'tiktok', TRUE),
('seed-post-9', '素人博主阿茶', '茶', '做了半年B站终于破万粉了', 'exp', '经验分享', '纯素人起步，不投流不买粉，全靠内容做起来的真实复盘。第一个月最痛苦发了20个视频没一个过千播放。转折点是第三个月做了一个吐槽视频突然爆了。', 'bilibili', TRUE),
('seed-post-10', '品牌主理人N', 'N', '为什么我宁愿找小博主也不找大V', 'guide', '干货教程', '作为小品牌，我们每年投放预算也就10万左右。分享一下为什么我们更愿意找1-5万粉的小博主：1. 性价比高 2. 粉丝更信任博主的推荐 3. 互动率通常比大V高 4. 合作配合度好。大V同时接很多品牌，根本不会认真对待你的产品。', 'all', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 种子本地需求
INSERT INTO local_demands (id, poster, business_name, city, district, category, title, description, budget, requirements, contact, status, is_seed) VALUES
('seed-local-1', '本地商家-老王', '老王家私房菜', '上海', '静安区', '餐饮', '需要小红书探店达人推广新菜品', '新开了三家分店，需要本地探店达人来体验新菜品并发布小红书笔记。要求真人出镜，不需要精致摆拍，真实体验即可。', '1500-3000', '粉丝1万+，有探店经验优先，需发笔记+抖音', '微信: wang_chef', 'open', TRUE),
('seed-local-2', '品牌方-小美', '美肌护肤', '北京', '朝阳区', '美容', '护肤品新品推广，找达人试用', '国产护肤品牌，需要5-10位达人在小红书/抖音发布使用体验。产品免费寄送+稿费。', '500-2000/篇', '粉丝5千+，内容垂直(美妆/护肤)，需要真人出镜', '微信: meiji_mkt', 'open', TRUE),
('seed-local-3', 'MCN-大锤', '锤子文化', '杭州', '余杭区', '娱乐', '招募抖音剧情类达人合作', '公司有品牌客户需要剧情类植入，找杭州本地达人合作。有编导支持，达人只需出镜。', '3000-8000/条', '抖音粉丝2万+，有表演经验优先，杭州优先', '微信: chuizi_mcn', 'open', TRUE),
('seed-local-4', '商家-阿强', '强哥潮牌', '广州', '天河区', '零售', '找穿搭博主合作推广潮牌新品', '广州本地潮牌店，需要在抖音/小红书找穿搭博主。合作模式：寄衣服+拍摄费+销售分成。', '1000-3000 + 提成', '时尚穿搭方向，粉丝3千+即可，需要有穿搭作品', '微信: qiang_shop', 'open', TRUE),
('seed-local-5', '品牌方-Linda', '乐活瑜伽', '深圳', '南山区', '健身', '瑜伽服品牌找健身达人', '深圳本地瑜伽服品牌，需要健身/瑜伽类达人在小红书和抖音推广。', '2000-5000/套', '健身/瑜伽方向，粉丝1万+，需要有健身内容经验', '微信: linda_yoga', 'open', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 种子对接需求
INSERT INTO match_demands (id, poster, role, platforms, budget, description, deal_status) VALUES
('seed-match-1', '示例-品牌方A', '品牌方', '["xhs","douyin"]', '2000-5000', '国产美妆品牌，找小红书/抖音达人做口红试色推广。需要有美妆经验，自然光线拍摄，不需要滤镜过重。', 'open'),
('seed-match-2', '示例-MCN机构', '品牌方', '["bilibili"]', '5000-10000', '科技品牌年度合作，需要B站科技区UP主做产品测评。要求客观真实，不说假话。', 'open'),
('seed-match-3', '示例-电商卖家', '品牌方', '["douyin","kuaishou"]', '1000-3000', '零食品牌找抖音/快手吃播达人合作，产品寄送+坑位费。需要能吃辣。', 'open'),
('seed-match-4', '示例-本地商家B', '品牌方', '["xhs"]', '500-1500', '上海咖啡店找本地生活方式博主探店。周末下午时段，提供免费咖啡和甜点+拍摄费。', 'open'),
('seed-match-5', '示例-品牌方C', '品牌方', '["all"]', '面议', '母婴品牌年度框架合作，寻找有育儿经验的达人妈妈。要求真人出镜，有0-3岁育儿经验。', 'open')
ON CONFLICT (id) DO NOTHING;

-- 5. Postgres Functions
-- 信任分计算
CREATE OR REPLACE FUNCTION calc_trust_score(p_username TEXT)
RETURNS INTEGER AS $$
DECLARE
  community_score INTEGER := 0;
  platform_score INTEGER := 0;
  review_score INTEGER := 0;
BEGIN
  SELECT COALESCE(level,1)*10 +
    (SELECT COUNT(*) FROM posts WHERE author = p_username)*2 +
    (SELECT COUNT(*) FROM friends WHERE username = p_username)
  INTO community_score FROM profiles WHERE username = p_username;

  SELECT COALESCE(jsonb_array_length(connected_platforms), 0) * 15
  INTO platform_score FROM profiles WHERE username = p_username;

  SELECT CASE WHEN COUNT(*) >= 1
    THEN ROUND(AVG(
      ((ratings->>'content_quality')::int + (ratings->>'communication')::int +
       (ratings->>'professionalism')::int + (ratings->>'data_performance')::int) / 4.0
    )) * 10 * COUNT(*)
    ELSE 0 END
  INTO review_score FROM reviews WHERE reviewee = p_username;

  RETURN LEAST((community_score*0.3 + platform_score*0.4 + review_score*0.3)::int, 999);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE TABLE IF NOT EXISTS post_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, username)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select_auth" ON post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_auth" ON post_likes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "likes_delete_auth" ON post_likes FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_post_likes ON post_likes(post_id, username);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 判断是否可评价
CREATE OR REPLACE FUNCTION can_review(p_reviewer TEXT, p_reviewee TEXT, p_deal_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  msg_count INTEGER;
  already_reviewed BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO msg_count FROM chat_messages
  WHERE (sender = p_reviewer AND recipient = p_reviewee)
     OR (sender = p_reviewee AND recipient = p_reviewer);

  SELECT EXISTS(
    SELECT 1 FROM reviews WHERE deal_id = p_deal_id AND reviewer = p_reviewer
  ) INTO already_reviewed;

  RETURN msg_count >= 5 AND NOT already_reviewed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确认合作
CREATE OR REPLACE FUNCTION confirm_deal(p_deal_id TEXT, p_partner TEXT)
RETURNS TEXT AS $$
DECLARE
  current_status TEXT;
BEGIN
  SELECT deal_status INTO current_status FROM match_demands WHERE id = p_deal_id;
  IF current_status != 'negotiating' AND current_status != 'open' THEN
    RETURN 'error: invalid status';
  END IF;
  UPDATE match_demands SET deal_status = 'active', deal_partner = p_partner, deal_confirmed_at = NOW()
  WHERE id = p_deal_id;
  INSERT INTO notifications (username, type, content, from_user)
  VALUES (p_partner, '对接', '合作已确认！', (SELECT poster FROM match_demands WHERE id = p_deal_id));
  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 标记完成
CREATE OR REPLACE FUNCTION complete_deal(p_deal_id TEXT)
RETURNS TEXT AS $$
BEGIN
  UPDATE match_demands SET deal_status = 'completed', deal_closed_at = NOW()
  WHERE id = p_deal_id AND deal_status = 'active';
  RETURN 'ok';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 添加信任分列
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;

-- 7. 索引
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee);
CREATE INDEX IF NOT EXISTS idx_invitation_inviter ON invitation_codes(inviter_username);
CREATE INDEX IF NOT EXISTS idx_match_deal_status ON match_demands(deal_status);

CREATE OR REPLACE FUNCTION get_poll_updates(
  since_ts timestamptz,
  username_query text,
  post_ids text[]
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'new_posts', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM posts WHERE created_at > since_ts ORDER BY created_at DESC LIMIT 20
    ) t), '[]'::jsonb),
    'notifs', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM notifications WHERE username = username_query AND created_at > since_ts ORDER BY created_at DESC LIMIT 20
    ) t), '[]'::jsonb),
    'chat_msgs', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM chat_messages WHERE (sender = username_query OR recipient = username_query) AND created_at > since_ts ORDER BY created_at ASC LIMIT 50
    ) t), '[]'::jsonb),
    'new_comments', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM comments WHERE post_id = ANY(post_ids) AND created_at > since_ts ORDER BY created_at ASC LIMIT 30
    ) t), '[]'::jsonb),
    'likes_sync', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT id AS post_id, likes FROM posts WHERE id = ANY(post_ids) AND updated_at > since_ts
    ) t), '[]'::jsonb),
    'new_recruits', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM recruits WHERE created_at > since_ts ORDER BY created_at DESC LIMIT 10
    ) t), '[]'::jsonb),
    'new_matches', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM match_demands WHERE created_at > since_ts ORDER BY created_at DESC LIMIT 10
    ) t), '[]'::jsonb),
    'new_local', COALESCE((SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM local_demands WHERE created_at > since_ts ORDER BY created_at DESC LIMIT 10
    ) t), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
