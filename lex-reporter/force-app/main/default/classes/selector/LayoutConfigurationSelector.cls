public with sharing class LayoutConfigurationSelector {
    public LayoutConfigurationSelector() {}

    public List<Layout_Configuration__c> selectConfigurationByObjectAndCreatedByCurrentUser(String objectName){
        List<Layout_Configuration__c> layoutConfiguration = [SELECT Id 
                                                                FROM Layout_Configuration__c
                                                                WHERE Object__c =: objectName
                                                                    AND CreatedById =: UserInfo.getUserId()
                                                                LIMIT 1];
        return SecurityUtil.sanitizeQueryResult(layoutConfiguration);
    }

    public List<Layout_Configuration__c> selectConfigurationsCreatedByCurrentUser(){
        List<Layout_Configuration__c> layoutConfiguration = [SELECT Object__c,Default_Fieldset__c
                                                            FROM Layout_Configuration__c
                                                            WHERE CreatedById = :UserInfo.getUserId()
                                                            ORDER BY CreatedDate ASC];
        return SecurityUtil.sanitizeQueryResult(layoutConfiguration);
    }
}
