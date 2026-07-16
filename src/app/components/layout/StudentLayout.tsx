import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Video,
  ClipboardList,
  Trophy,
  MessageCircle,
  DollarSign,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  GraduationCap,
  Bell,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { NotificationBell } from './NotificationBell';
import { api } from '../../lib/api';
import { toast } from 'sonner';

const navigation = [
  { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
  { name: 'My Courses', href: '/student/courses', icon: BookOpen },
  { name: 'Study Materials', href: '/student/materials', icon: FileText },
  { name: 'Live Classes', href: '/student/classes', icon: Video },
  { name: 'Tests', href: '/student/tests', icon: ClipboardList },
  { name: 'Results', href: '/student/results', icon: Trophy },
  { name: 'Assignments', href: '/student/assignments', icon: BookOpen },
  { name: 'Ask Doubt', href: '/student/doubts', icon: MessageCircle },
  { name: 'Fees', href: '/student/fees', icon: DollarSign },
  { name: 'Notifications', href: '/student/notifications', icon: Bell },
  { name: 'My Profile', href: '/student/profile', icon: User },
];

export const StudentLayout: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Profile completion state
  const [profileLoading, setProfileLoading] = useState(true);
  const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    address: '',
    class: '',
    board: '',
  });

  const checkProfileCompleteness = (p: any) => {
    return (
      !p.name?.trim() ||
      !p.phone?.trim() ||
      !p.profile?.parentName?.trim() ||
      !p.profile?.parentPhone?.trim() ||
      !p.profile?.address?.trim() ||
      !p.profile?.class?.trim() ||
      !p.profile?.board?.trim()
    );
  };

  React.useEffect(() => {
    let mounted = true;
    api.student.getProfile()
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          const p = res.data;
          setProfileForm({
            name: p.name || '',
            phone: p.phone || '',
            parentName: p.profile?.parentName || '',
            parentPhone: p.profile?.parentPhone || '',
            address: p.profile?.address || '',
            class: p.profile?.class || '',
            board: p.profile?.board || '',
          });
          setIsProfileIncomplete(checkProfileCompleteness(p));
        }
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setProfileLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleCompleteProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, phone, parentName, parentPhone, address, class: studentClass, board } = profileForm;
    if (!name.trim() || !phone.trim() || !parentName.trim() || !parentPhone.trim() || !address.trim() || !studentClass.trim() || !board.trim()) {
      toast.error('All profile fields are required.');
      return;
    }

    setSavingProfile(true);
    try {
      await api.student.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        address: address.trim(),
        class: studentClass.trim(),
        board: board.trim(),
      });
      setIsProfileIncomplete(false);
      await refreshUser();
      toast.success('Profile completed successfully! Welcome to the portal.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-orange-600 mx-auto" />
          <p className="text-gray-500 font-medium">Loading portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && !isProfileIncomplete && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - disabled if profile is incomplete */}
      {!isProfileIncomplete && (
        <aside
          className={cn(
            'fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r transform transition-transform duration-300 lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-br from-orange-600 to-pink-600 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">Student Portal</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-gradient-to-r from-orange-600 to-pink-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className={cn(isProfileIncomplete ? 'w-full' : 'lg:pl-64')}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b">
          <div className="flex items-center justify-between px-4 py-4">
            {!isProfileIncomplete && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
            )}

            <div className="flex-1 lg:ml-0" />

            <div className="flex items-center space-x-4">
              {!isProfileIncomplete && <NotificationBell />}

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-orange-600 to-pink-600 text-white">
                        {user?.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!isProfileIncomplete && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/student/profile')}>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/student/profile')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content / Profile Completion Form */}
        <main className="p-6 flex items-center justify-center min-h-[calc(100vh-73px)]">
          {isProfileIncomplete ? (
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-gradient-to-br from-orange-600 to-pink-600 rounded-xl text-white mb-2">
                  <User className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900">Complete Your Profile</h1>
                <p className="text-gray-500 max-w-md mx-auto">
                  Please fill in the remaining details to access your student portal dashboard.
                </p>
              </div>

              <form onSubmit={handleCompleteProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="complete-name">Full Name</Label>
                    <Input
                      id="complete-name"
                      type="text"
                      placeholder="John Doe"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="complete-phone">Phone Number</Label>
                    <Input
                      id="complete-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  {/* Parent Name */}
                  <div className="space-y-2">
                    <Label htmlFor="complete-parent-name">Parent/Guardian Name</Label>
                    <Input
                      id="complete-parent-name"
                      type="text"
                      placeholder="Richard Doe"
                      value={profileForm.parentName}
                      onChange={(e) => setProfileForm({ ...profileForm, parentName: e.target.value })}
                      required
                    />
                  </div>

                  {/* Parent Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="complete-parent-phone">Parent Phone Number</Label>
                    <Input
                      id="complete-parent-phone"
                      type="tel"
                      placeholder="+91 98765 43211"
                      value={profileForm.parentPhone}
                      onChange={(e) => setProfileForm({ ...profileForm, parentPhone: e.target.value })}
                      required
                    />
                  </div>

                  {/* Class */}
                  <div className="space-y-2">
                    <Label htmlFor="complete-class">Class</Label>
                    <Input
                      id="complete-class"
                      type="text"
                      placeholder="CBSE 10 / Grade 12"
                      value={profileForm.class}
                      onChange={(e) => setProfileForm({ ...profileForm, class: e.target.value })}
                      required
                    />
                  </div>

                  {/* Board */}
                  <div className="space-y-2">
                    <Label htmlFor="complete-board">Board</Label>
                    <Input
                      id="complete-board"
                      type="text"
                      placeholder="CBSE / ICSE / State Board"
                      value={profileForm.board}
                      onChange={(e) => setProfileForm({ ...profileForm, board: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="complete-address">Residential Address</Label>
                  <Input
                    id="complete-address"
                    type="text"
                    placeholder="123 Main St, Apartment 4B, City, State, ZIP"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 h-11 text-base font-semibold transition-colors"
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Saving profile...</>
                  ) : (
                    'Save & Proceed to Dashboard'
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};
