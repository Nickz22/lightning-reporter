public with sharing class PushUsageMetricsBatch implements Database.Batchable<SObject>, Database.stateful, Database.allowsCallouts{

    public PushUsageMetricsBatch(){}

    public Database.QueryLocator start(Database.BatchableContext BC){
        return Database.getQueryLocator(
            'SELECT Action__c,Object__c,CreatedBy.Name,CreatedById,User_Profile__c FROM Usage_Metric__c'
        );
    }

    public void execute(Database.BatchableContext BC, List<sObject> scope){
        // initialize HTTP call
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:Usage_Metric_Endpoint/services/apexrest/Reporter/lightningreporter/usage');
        req.setMethod('POST');
        req.setHeader('Content-Type','application/json');
        UsagePayload payload = new UsagePayload(
            (List<Usage_Metric__c>)scope, 
            new PermissionSetAssignmentSelector().selectLightningReporterUsers().size()
        );
        req.setBody(JSON.serialize(new Map<String, String>{'payload' => JSON.serialize(payload)}));
        // send HTTP call
        HttpResponse res = http.send(req);
        // process response
        if(res.getStatusCode() == 201 || res.getStatusCode() == 200){
            System.debug('SUCCESS');
        } else {
            System.debug('FAILURE [' + res.getStatusCode() + ']: ' + res.getBody());
        }
    }

    public void finish(Database.BatchableContext BC){}

    public class UsagePayload{
        List<Usage_Metric__c> pinUsage = new List<Usage_Metric__c>();
        List<Usage_Metric__c> saveUsage = new List<Usage_Metric__c>();
        List<Usage_Metric__c> commentUsage = new List<Usage_Metric__c>();
        Integer totalLicensedUsers = 0;
        String organizationName = UserInfo.getOrganizationName();

        public UsagePayload(List<Usage_Metric__c> usage, Integer totalLicensedUsers){
            // segment usage by Action__c value
            this.pinUsage = new List<Usage_Metric__c>();
            this.saveUsage = new List<Usage_Metric__c>();
            this.commentUsage = new List<Usage_Metric__c>();
            for(Usage_Metric__c u : usage){
                switch on u.Action__c.toLowerCase(){
                    when 'pin layout'{
                        this.pinUsage.add(u);
                    }
                    when 'save records'{
                        this.saveUsage.add(u);
                    }
                    when 'comment'{
                        this.commentUsage.add(u);
                    }
                }
            }
            this.totalLicensedUsers = totalLicensedUsers;
        }
    }
}