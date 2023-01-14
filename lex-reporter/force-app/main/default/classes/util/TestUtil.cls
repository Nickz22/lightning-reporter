@isTest
public with sharing class TestUtil {

    static User cachedLightningReporterAdmin;
    public static User lightningReporterAdmin{
        get{
            if(cachedLightningReporterAdmin == null){
                cachedLightningReporterAdmin = getLightningReporterAdminUser();
            }
    
            return cachedLightningReporterAdmin;
        }
    }
    
    public static User getLightningReporterAdminUser(){
        User adminUser = [SELECT Id, LastName, Alias, Email, TimeZoneSidKey, 
                                LocaleSidKey, LanguageLocaleKey, EmailEncodingKey, ProfileId
                            FROM User 
                            WHERE Profile.Name LIKE '%Admin%' 
                            LIMIT 1];
        User adminClone = adminUser.clone(false, true, false, false);
        adminClone.Username = 'test_lex_reporter'+Math.random()+'@salesforce.com';
        insert adminClone;
        insert new PermissionSetAssignment(
            AssigneeId=adminClone.Id, 
            PermissionSetId = [SELECT Id 
                                FROM PermissionSet 
                                WHERE Name =:C.LIGHTNING_REPORTER_PERMISSION 
                                LIMIT 1].Id
        );
        return adminClone;
    }
}
