import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountsDashboard from "@/components/Accounts/AccountsDashboard";
import FeeCategoriesTab from "@/components/Accounts/FeeCategoriesTab";
import ClassFeeSetupTab from "@/components/Accounts/ClassFeeSetupTab";
import MonthlyGeneratorTab from "@/components/Accounts/MonthlyGeneratorTab";
import StudentLedgerTab from "@/components/Accounts/StudentLedgerTab";
import CollectionTab from "@/components/Accounts/CollectionTab";
import TransactionsTab from "@/components/Accounts/TransactionsTab";
import CashBankTab from "@/components/Accounts/CashBankTab";
import AccountsSettingsTab from "@/components/Accounts/AccountsSettingsTab";
import SalaryTab from "@/components/Accounts/SalaryTab";
import GatewaySettingsTab from "@/components/Accounts/GatewaySettingsTab";
import ReportsTab from "@/components/Accounts/ReportsTab";
import AuditLogTab from "@/components/Accounts/AuditLogTab";
import { Wallet } from "lucide-react";

const AccountsPage = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Wallet className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold font-heading">Payment & Accounts</h1>
          <p className="text-sm text-muted-foreground">Complete financial management for your school.</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <div className="overflow-x-auto -mx-2 px-2">
          <TabsList className="w-max">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="fee-categories">Fee Categories</TabsTrigger>
            <TabsTrigger value="fee-setup">Class Fee Setup</TabsTrigger>
            <TabsTrigger value="generator">Monthly Generator</TabsTrigger>
            <TabsTrigger value="ledger">Student Ledger</TabsTrigger>
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="salary">Salary</TabsTrigger>
            <TabsTrigger value="accounts">Cash & Bank</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="gateways">Online Gateways</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard"><AccountsDashboard /></TabsContent>
        <TabsContent value="fee-categories"><FeeCategoriesTab /></TabsContent>
        <TabsContent value="fee-setup"><ClassFeeSetupTab /></TabsContent>
        <TabsContent value="generator"><MonthlyGeneratorTab /></TabsContent>
        <TabsContent value="ledger"><StudentLedgerTab /></TabsContent>
        <TabsContent value="collection"><CollectionTab /></TabsContent>
        <TabsContent value="income"><TransactionsTab kind="income" /></TabsContent>
        <TabsContent value="expense"><TransactionsTab kind="expense" /></TabsContent>
        <TabsContent value="salary"><SalaryTab /></TabsContent>
        <TabsContent value="accounts"><CashBankTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="gateways"><GatewaySettingsTab /></TabsContent>
        <TabsContent value="audit"><AuditLogTab /></TabsContent>
        <TabsContent value="settings"><AccountsSettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountsPage;
