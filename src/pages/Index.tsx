import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Deal {
  id: string;
  amount: number;
  description: string;
  status: 'created' | 'paid' | 'delivered' | 'completed' | 'dispute';
  buyer: string;
  seller: string;
  commission: number;
  createdAt: Date;
}

const mockDeals: Deal[] = [
  {
    id: '1',
    amount: 15000,
    description: 'Дизайн логотипа для стартапа',
    status: 'paid',
    buyer: '@ivan_buyer',
    seller: '@anna_designer',
    commission: 750,
    createdAt: new Date('2025-11-03'),
  },
  {
    id: '2',
    amount: 8500,
    description: 'Разработка посадочной страницы',
    status: 'delivered',
    buyer: '@maria_client',
    seller: '@dev_pro',
    commission: 425,
    createdAt: new Date('2025-11-04'),
  },
  {
    id: '3',
    amount: 3000,
    description: 'Консультация по маркетингу (1 час)',
    status: 'completed',
    buyer: '@business_owner',
    seller: '@marketing_expert',
    commission: 150,
    createdAt: new Date('2025-10-28'),
  },
];

const statusConfig = {
  created: { label: 'Создана', color: 'bg-muted text-muted-foreground', icon: 'FileText' },
  paid: { label: 'Оплачена', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: 'Clock' },
  delivered: { label: 'Доставлено', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'Package' },
  completed: { label: 'Завершена', color: 'bg-green-100 text-green-700 border-green-200', icon: 'CheckCircle2' },
  dispute: { label: 'Спор', color: 'bg-red-100 text-red-700 border-red-200', icon: 'AlertTriangle' },
};

export default function Index() {
  const [deals] = useState<Deal[]>(mockDeals);
  const [newDeal, setNewDeal] = useState({ amount: '', description: '' });
  const [activeTab, setActiveTab] = useState('dashboard');

  const calculateCommission = (amount: number) => amount * 0.05;

  const handleCreateDeal = () => {
    if (!newDeal.amount || !newDeal.description) {
      toast.error('Заполните все поля');
      return;
    }
    toast.success('Сделка создана! Ссылка скопирована в буфер обмена');
    setNewDeal({ amount: '', description: '' });
  };

  const handleConfirmDelivery = (dealId: string) => {
    toast.success('Получение подтверждено! Средства переведены продавцу');
  };

  const handleOpenDispute = (dealId: string) => {
    toast.warning('Спор открыт. Администратор рассмотрит вашу заявку');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-background">
      <div className="container max-w-6xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-12 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <Icon name="Shield" className="text-white" size={24} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              OPLATA
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Безопасные сделки в Telegram. Деньги под защитой до подтверждения получения
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto h-auto p-1.5">
            <TabsTrigger value="dashboard" className="gap-2 py-3">
              <Icon name="LayoutDashboard" size={18} />
              <span className="hidden sm:inline">Сделки</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2 py-3">
              <Icon name="Plus" size={18} />
              <span className="hidden sm:inline">Создать</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 py-3">
              <Icon name="User" size={18} />
              <span className="hidden sm:inline">Профиль</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 animate-fade-in">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Всего сделок</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{deals.length}</div>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Активных</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {deals.filter(d => d.status === 'paid' || d.status === 'delivered').length}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Завершено</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {deals.filter(d => d.status === 'completed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Icon name="Receipt" size={24} />
                Мои сделки
              </h2>
              {deals.map((deal) => (
                <Card key={deal.id} className="border-2 hover:shadow-lg transition-all hover:scale-[1.01] animate-scale-in">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-xl">{deal.amount.toLocaleString('ru-RU')} ₽</CardTitle>
                          <Badge className={statusConfig[deal.status].color} variant="outline">
                            <Icon name={statusConfig[deal.status].icon as any} size={14} className="mr-1" />
                            {statusConfig[deal.status].label}
                          </Badge>
                        </div>
                        <CardDescription className="text-base">{deal.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Покупатель</p>
                        <p className="font-medium">{deal.buyer}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Продавец</p>
                        <p className="font-medium">{deal.seller}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Комиссия платформы</p>
                        <p className="font-medium">{deal.commission} ₽ (5%)</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Создана</p>
                        <p className="font-medium">{deal.createdAt.toLocaleDateString('ru-RU')}</p>
                      </div>
                    </div>

                    {deal.status === 'paid' && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button variant="outline" className="flex-1" onClick={() => handleOpenDispute(deal.id)}>
                          <Icon name="AlertTriangle" size={16} className="mr-2" />
                          Открыть спор
                        </Button>
                      </div>
                    )}

                    {deal.status === 'delivered' && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleConfirmDelivery(deal.id)}>
                          <Icon name="CheckCircle2" size={16} className="mr-2" />
                          Подтвердить получение
                        </Button>
                        <Button variant="outline" onClick={() => handleOpenDispute(deal.id)}>
                          <Icon name="AlertTriangle" size={16} className="mr-2" />
                          Спор
                        </Button>
                      </div>
                    )}

                    {deal.status === 'completed' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                        <Icon name="CheckCircle2" size={16} className="inline mr-2" />
                        Сделка успешно завершена. Средства переведены продавцу
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="create" className="animate-fade-in">
            <Card className="max-w-2xl mx-auto border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Icon name="PlusCircle" size={28} />
                  Создать новую сделку
                </CardTitle>
                <CardDescription>
                  Укажите сумму и описание сделки. После создания вы получите уникальную ссылку для контрагента
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="amount">Сумма сделки (₽)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="15000"
                    value={newDeal.amount}
                    onChange={(e) => setNewDeal({ ...newDeal, amount: e.target.value })}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    placeholder="Дизайн логотипа для стартапа..."
                    value={newDeal.description}
                    onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                    rows={4}
                  />
                </div>

                {newDeal.amount && (
                  <div className="bg-muted rounded-lg p-4 space-y-2 animate-scale-in">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Сумма сделки:</span>
                      <span className="font-medium">{parseFloat(newDeal.amount).toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Комиссия OPLATA (5%):</span>
                      <span className="font-medium">{calculateCommission(parseFloat(newDeal.amount)).toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Продавец получит:</span>
                      <span className="font-bold text-lg">{(parseFloat(newDeal.amount) - calculateCommission(parseFloat(newDeal.amount))).toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </div>
                )}

                <Button onClick={handleCreateDeal} className="w-full" size="lg">
                  <Icon name="Link" size={20} className="mr-2" />
                  Создать сделку и получить ссылку
                </Button>

                <div className="bg-accent border border-border rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Icon name="Info" size={18} className="mt-0.5 shrink-0 text-primary" />
                    <div className="space-y-2">
                      <p className="font-medium">Как это работает?</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Покупатель оплачивает сделку через ЮКassa</li>
                        <li>Деньги удерживаются на платформе</li>
                        <li>Продавец выполняет работу</li>
                        <li>Покупатель подтверждает получение</li>
                        <li>Средства переводятся продавцу (минус 5% комиссия)</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            <Card className="max-w-2xl mx-auto border-2">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Icon name="User" size={28} />
                  Профиль
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    И
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">@ivan_user</h3>
                    <p className="text-muted-foreground">ivan@example.com</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold">Статистика</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Всего сделок</p>
                      <p className="text-2xl font-bold">{deals.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-700 mb-1">Завершено успешно</p>
                      <p className="text-2xl font-bold text-green-700">{deals.filter(d => d.status === 'completed').length}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold">Настройки уведомлений</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Telegram уведомления</p>
                        <p className="text-sm text-muted-foreground">О статусах сделок</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Icon name="Bell" size={16} className="mr-2" />
                        Включено
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email уведомления</p>
                        <p className="text-sm text-muted-foreground">Дублирование на почту</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Icon name="Mail" size={16} className="mr-2" />
                        Включено
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Icon name="Shield" size={16} />
            <span>Защищено escrow-механизмом</span>
          </div>
          <p>© 2025 OPLATA. Безопасные сделки в Telegram</p>
        </footer>
      </div>
    </div>
  );
}
