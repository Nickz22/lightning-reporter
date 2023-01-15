@isTest
public class LightningReporterControllerTest2 {
    
    @TestSetup
    static void makeData(){
        insert new Layout_Configuration__c(
            Default_Fieldset__c = 'Id,Name',
            Object__c = 'Contact'
        );
    }

    @isTest
    static void givenDefaultTableConfiguration_verifyDefaultDTOs(){
        Layout_Configuration__c config = [SELECT Default_Fieldset__C, Object__c
                                            FROM Layout_Configuration__c 
                                            WHERE Object__c = 'Contact'
                                            LIMIT 1][0];
        String contactType = config.Object__c;
        String defaultFields = config.Default_Fieldset__c;

        List<TableConfigDTO> dtos = LightningReporterController.getPinnedViews();
        System.assertEquals(1, dtos.size());

        Integer numAssertions = 0;
        for(FieldDTO dto : dtos[0].defaultFields){            
            if(defaultFields.containsIgnoreCase(dto.name)){
                System.assert(dto.defaultSelected);
                numAssertions++;
            }
        }

        List<String> defaultFieldsArray = defaultFields.split(',');
        System.assertEquals(2, defaultFieldsArray.size());
        System.assertEquals(numAssertions, defaultFieldsArray.size());
    }
}
