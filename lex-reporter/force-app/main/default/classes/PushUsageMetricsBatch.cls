public with sharing class PushUsageMetricsBatch implements Database.Batchable<SObject>, Database.stateful, Database.allowsCallouts{

    public PushUsageMetricsBatch(){}

    public Database.QueryLocator start(Database.BatchableContext BC){
        return Database.getQueryLocator(
            'SELECT Action__c,Object__c,CreatedById FROM Usage_Metric__c'
        );
    }

    public void execute(Database.BatchableContext BC, List<sObject> scope){

        List<Usage_Metric__c> enrichedMetrics = this.enrichUserData(scope);
        // initialize HTTP call
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:Usage_Metric_Endpoint/services/apexrest/Reporter/lightningreporter/usage');
        req.setMethod('POST');
        req.setHeader('Content-Type','application/json');
        UsagePayload payload = new UsagePayload(
            enrichedMetrics, 
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

    private List<Usage_Metric__c> enrichUserData(List<Usage_Metric__c> metrics){

        Set<Id> userIds = new Set<Id>();
        // extract createdbyid from metrics
        for(Usage_Metric__c m : metrics){
            userIds.add(m.CreatedById);
        }

        Map<Id, User> userById = new Map<Id, User>([SELECT Profile.Name,UserRole.Name FROM User WHERE Id IN: userIds]);
    
        for(Usage_Metric__c m : metrics){
            m.Tracked_User_Profile__c = userById.get(m.CreatedById).Profile.Name;
            m.Tracked_User_Role__c = userById.get(m.CreatedById).UserRole.Name;
            m.Tracked_User_Id__c = m.CreatedById;
        }

        return metrics;
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