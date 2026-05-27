import {
  UtensilsCrossed, ShoppingCart, Utensils, Bike, Coffee,
  Home, Zap, Package, Armchair,
  Car, Bus, Plane,
  Heart, Hospital, Pill, Dumbbell, Sparkles,
  ShoppingBag, Shirt, Laptop,
  Palette, Gamepad2, Target, MapPin, Tv,
  BookOpen, GraduationCap, FileText,
  Smartphone, AppWindow,
  CreditCard, Shield, Percent,
  Users, Flower2, Gift, Wine,
  MoreHorizontal,
  TrendingUp, TrendingDown, ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  // Level 1
  '식생활': UtensilsCrossed,
  '주거': Home,
  '교통': Car,
  '건강': Heart,
  '쇼핑': ShoppingBag,
  '여가/문화': Palette,
  '교육': BookOpen,
  '통신': Smartphone,
  '금융': CreditCard,
  '사교': Users,
  // 식생활
  '마트/식재료': ShoppingCart,
  '외식': Utensils,
  '배달': Bike,
  '카페/음료': Coffee,
  // 주거
  '월세/관리비': Home,
  '공과금': Zap,
  '생활용품': Package,
  '가구/인테리어': Armchair,
  // 교통
  '대중교통': Bus,
  '택시/호출': Car,
  '자동차': Car,
  '여행교통': Plane,
  // 건강
  '병원/의원': Hospital,
  '약국': Pill,
  '피트니스': Dumbbell,
  '미용/위생': Sparkles,
  // 쇼핑
  '의류/패션': Shirt,
  '전자기기': Laptop,
  '기타쇼핑': ShoppingBag,
  // 여가/문화
  '엔터테인먼트': Gamepad2,
  '취미': Target,
  '여행/숙박': MapPin,
  '구독서비스': Tv,
  // 교육
  '학원/강좌': GraduationCap,
  '도서/자료': BookOpen,
  '자격증/시험': FileText,
  // 통신
  '휴대폰/인터넷': Smartphone,
  '앱/소프트웨어': AppWindow,
  // 금융
  '보험료': Shield,
  '수수료/이자': Percent,
  // 사교
  '경조사': Flower2,
  '선물': Gift,
  '회식/모임': Wine,
  // Legacy
  '식비': UtensilsCrossed,
  '의료': Heart,
  '여가': Palette,
  '기타': MoreHorizontal,
}

export { TrendingUp, TrendingDown, ArrowLeftRight }

interface CategoryIconProps {
  name: string
  size?: number
  color?: string
}

export function CategoryIcon({ name, size = 20, color = 'currentColor' }: CategoryIconProps) {
  const Icon = ICON_MAP[name] ?? MoreHorizontal
  return <Icon size={size} color={color} strokeWidth={1.8} />
}
