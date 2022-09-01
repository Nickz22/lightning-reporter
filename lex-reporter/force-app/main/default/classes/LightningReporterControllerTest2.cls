@isTest
public class LightningReporterControllerTest2 {
    
    @TestSetup
    static void makeData(){
        insert new LEX_Reporter_Table_Configuration__c(
            Default_Fieldset__c = 'Id,Name',
            Object__c = 'Contact'
        );
    }

    /**
     * TODO: 
     * add a test case for 0 default table config records
     */

    @isTest
    static void givenDefaultTableConfiguration_verifyDefaultDTOs(){
        LEX_Reporter_Table_Configuration__c config = [SELECT Default_Fieldset__C, Object__c
                                                        FROM LEX_Reporter_Table_Configuration__c 
                                                        WHERE Object__c = 'Contact'
                                                        LIMIT 1][0];
        String contactType = config.Object__c;
        String defaultFields = config.Default_Fieldset__c;
        // invoke LightningReporterController.getFieldsFromType()
        List<LightningReporterController.FieldDTO> dtos = LightningReporterController.getFieldsFromType(contactType);

        Integer numAssertions = 0;
        for(LightningReporterController.FieldDTO dto : dtos){            
            if(defaultFields.containsIgnoreCase(dto.name)){
                System.assert(dto.defaultSelected);
                numAssertions++;
            }
        }

        List<String> defaultFieldsArray = defaultFields.split(',');
        System.assert(defaultFieldsArray.size()==2);
        System.assert(defaultFieldsArray.size()==numAssertions);       
    }
}
