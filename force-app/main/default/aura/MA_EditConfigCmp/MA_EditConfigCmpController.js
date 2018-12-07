/*
Author: Doug Ayers
Website: https://douglascayers.com
GitHub: https://github.com/douglascayers/sfdx-mass-action-scheduler
License: BSD 3-Clause License
 */
({
    onInit : function( component, event, helper ) {

        var recordId = component.get( 'v.recordId' );

        // initialize wizard to first step
        var wizard = component.find( 'wizard' );
        wizard.moveToStage( 0 );
        component.set( 'v.wizardActiveStageIndex', 0 );

        component.find( 'lc_url' ).getUrlInfoAsync()
            .then( $A.getCallback( function( urlInfo ) {

                component.set( 'v.urlInfo', urlInfo );

            })).then( $A.getCallback( function() {

                helper.getObjectDescribeAsync( component )
                    .then( $A.getCallback( function( objectDescribe ) {

                        component.set( 'v.objectDescribe', objectDescribe );

                    })).catch( $A.getCallback( function( error ) {

                        helper.toastMessage( 'Error Getting Object Describe', error, 'error' );

                    }));

                helper.getRecordAsync( component, recordId )
                    .then( $A.getCallback( function( record ) {

                        component.set( 'v.record', record );
                        component.set( 'v.sourceType', record.sourceType );
                        component.set( 'v.targetType', record.targetType );
                        component.set( 'v.targetSobjectType', record.targetSobjectType );
                        component.set( 'v.targetInvocableAction', record.targetActionName );

                        if ( !$A.util.isUndefinedOrNull( record.sourceReportID ) ) {

                            helper.getReportAsync( component, record.sourceReportID )
                                .then( $A.getCallback( function( report ) {

                                    if ( !$A.util.isUndefinedOrNull( report ) ) {
                                        component.set( 'v.sourceReport', report );
                                        component.set( 'v.sourceReportId', ( report.Id && report.Id.substring( 0, 15 ) ) );
                                        component.set( 'v.sourceReportFolderId', ( report.OwnerId && report.OwnerId.substring( 0, 15 ) ) );
                                        component.set( 'v.sourceReportColumnName', record.sourceReportColumnName );
                                    }

                                })).catch( $A.getCallback( function( error ) {

                                    helper.toastMessage( 'Error Getting Report', error, 'error' );

                                }));

                        }

                        if ( !$A.util.isUndefinedOrNull( record.sourceListViewID ) ) {

                            helper.getListViewAsync( component, record.sourceListViewID )
                                .then( $A.getCallback( function( listView ) {

                                    if ( !$A.util.isUndefinedOrNull( listView ) ) {
                                        component.set( 'v.sourceListView', listView );
                                        component.set( 'v.sourceListViewId', ( listView.Id && listView.Id.substring( 0, 15 ) ) );
                                        component.set( 'v.sourceListViewSobjectType', listView.SobjectType );
                                    }

                                })).catch( $A.getCallback( function( error ) {

                                    helper.toastMessage( 'Error Getting List View', error, 'error' );

                                }));

                        }

                        if ( !$A.util.isUndefinedOrNull( record.targetActionName ) ) {

                            helper.renderTargetInvocableActions( component );

                        }

                        helper.initScheduleOptions( component );

                    }));

            })).catch( $A.getCallback( function( error ) {

                helper.toastMessage( 'Error Getting URLs', error, 'error' );

            }));

    },

    handleNavigationButtonClick : function( component, event, helper ) {

        var wizard = component.find( 'wizard' );
        var currentStageIndex = wizard.get( 'v.activeChevron' );

        var button = event.getSource();
        var buttonLabel = button.get( 'v.label' );

        if ( buttonLabel == 'Previous' ) {

            wizard.moveToStage( currentStageIndex - 1 );

        } else if ( buttonLabel == 'Next' ) {

            var isValidToProceed = true;
            var inputCmps = []; // fields to validate to proceed to next step

            if ( currentStageIndex === 0 ) {                // Details

                inputCmps = [
                    component.find( 'inputName' ),
                    component.find( 'inputDeveloperName' ),
                    component.find( 'inputDescription' ),
                    component.find( 'inputActive' ),
                    component.find( 'inputBatchSize' )
                ];

            } else if ( currentStageIndex === 1 ) {         // Choose Source

                inputCmps = [
                    component.find( 'inputSourceType' ),
                    component.find( 'inputSourceReportFolder' ),
                    component.find( 'inputSourceReport' ),
                    component.find( 'inputSourceReportColumn' ),
                    component.find( 'inputSourceListViewSobjectType' ),
                    component.find( 'inputSourceListView' )
                ];

            } else if ( currentStageIndex === 2 ) {         // Choose Action

                inputCmps = [
                    component.find( 'inputTargetType' ),
                    component.find( 'inputTargetSobjectType' ),
                    component.find( 'inputTargetAction' )
                ];

            } else if ( currentStageIndex === 3 ) {         // Field Mappings

                var inputSourceFieldNames = component.find( 'inputMappingSourceFieldName' );

                if ( $A.util.isArray( inputSourceFieldNames ) ) {
                    for ( var i = 0; i < inputSourceFieldNames.length; i++ ) {
                        inputCmps.push( inputSourceFieldNames[i] );
                    }
                } else {
                    inputCmps.push( inputSourceFieldNames );
                }

            }

            var validationResult = helper.validateInputs( component, inputCmps );

            isValidToProceed = ( !validationResult.hasErrors && isValidToProceed );

            if ( isValidToProceed ) {

                wizard.advanceProgress();

                // if advancing to field mappings section then
                // determine the action inputs and any current mappings
                if ( currentStageIndex === 2 ) {
                    helper.renderTargetFieldMappings( component );
                }

            } else {

                validationResult.components.forEach( function( componentResult ) {
                    if ( componentResult.hasError ) {
                        helper.toastMessage( 'Step Incomplete', componentResult.message, 'error' );
                    }
                });

            }

        }

    },

    handleSaveButtonClick : function( component, event, helper ) {

        var inputCmps = [
            component.find( 'inputScheduleFrequency' ),
            component.find( 'inputScheduleHourOfDay' ),
            component.find( 'inputScheduleWeekday' ),
            component.find( 'inputScheduleDayOfMonth' ),
            component.find( 'inputScheduleMonthOfYear' ),
            component.find( 'inputScheduleCron' )
        ];

        var validationResult = helper.validateInputs( component, inputCmps );

        var isValidToSave = !validationResult.hasErrors;

        if ( isValidToSave ) {

            helper.saveRecordAsync( component )
                .then( $A.getCallback( function( result ) {

                    if ( result.success ) {

                        helper.toastMessage( 'Save Successful', '', 'success' );

                        // Cause lightning data service to invalidate it's cache.
                        // I added this after realizing the compact layout was not
                        // picking up changes to fields by this component.
                        // I started out firing the force:refreshView event but
                        // that only worked if the record already existed, if we
                        // just saved a new record then we needed to still navigate to it.
                        // And I didn't know how to listen for the refreshView event to complete
                        // but I did find that I could use a callback in the LDS reloadRecord method.
                        var lds = component.find( 'lds' );
                        lds.set( 'v.recordId', result.recordId );
                        lds.reloadRecord( true, function() {
                            helper.navigateToRecord( result.recordId );
                        });

                    }

                })).catch( $A.getCallback( function( error ) {

                    helper.toastMessage( 'Error', error, 'error' );

                }));

        } else {

            validationResult.components.forEach( function( componentResult ) {
                if ( componentResult.hasError ) {
                    helper.toastMessage( 'Step Incomplete', componentResult.message, 'error' );
                }
            });

        }

    },

    // ----------------------------------------------------------------------------------

    handleInputNameFieldBlur : function( component, event, helper ) {

        var inputCmp = event.getSource();
        var inputValue = inputCmp.get( 'v.value' );

        // predict the developer name from the name, a familiar feature to admins
        if ( !$A.util.isEmpty( inputValue ) && $A.util.isEmpty( component.get( 'v.record.developerName' ) ) ) {
            component.set( 'v.record.developerName', inputValue.trim().replace( /[ ]+/g, '_' ) );
        }

    },

    handleInputListBoxChanged : function( component, event, helper ) {

        var selectedOptions = event.getParam( 'value' );

        if ( !$A.util.isEmpty( selectedOptions ) ) {
            selectedOptions.sort();
        }

    },

    // ----------------------------------------------------------------------------------

    handleSourceTypeChange : function( component, event, helper ) {

        var sourceType = component.get( 'v.sourceType' );
        var record = component.get( 'v.record' );

        if ( sourceType != 'Report' ) {

            record.sourceReportID = null;
            record.sourceReportColumnName = null;

            component.set( 'v.sourceReport', null );
            component.set( 'v.sourceReportId', null );
            component.set( 'v.sourceReportFolderId', null );
            component.set( 'v.sourceReportColumns', null );
            component.set( 'v.sourceReportColumnName', null );

        } else {

            if ( $A.util.isEmpty( component.get( 'v.sourceReportFolders' ) ) ) {

                helper.getReportFoldersAsync( component )
                    .then( $A.getCallback( function( reportFolders ) {

                        component.set( 'v.sourceReportFolders', reportFolders );

                    })).catch( $A.getCallback( function( error ) {

                        helper.toastMessage( 'Error Getting Report Folders', error, 'error' );

                    }));

            }

        }

        if ( sourceType != 'ListView' ) {

            record.sourceListViewID = null;

            component.set( 'v.sourceListView', null );
            component.set( 'v.sourceListViewId', null );
            component.set( 'v.sourceListViewSobjectType', null );

        } else {

            if ( $A.util.isEmpty( component.get( 'v.sourceListViewSobjectTypes' ) ) ) {

                helper.getObjectNamesAsync( component )
                    .then( $A.getCallback( function( objectNames ) {

                        component.set( 'v.sourceListViewSobjectTypes', objectNames );

                    })).catch( $A.getCallback( function( error ) {

                        helper.toastMessage( 'Error Getting Object Names', error, 'error' );

                    }));

            }

        }

        component.set( 'v.record', record );
        component.set( 'v.sourceTypeURL', null );

    },

    // ----------------------------------------------------------------------------------

    handleSourceReportFolderChange : function( component, event, helper ) {

        var sourceType = component.get( 'v.sourceType' );
        var report = component.get( 'v.sourceReport' );
        var folderId = component.get( 'v.sourceReportFolderId' );

        if ( sourceType == 'Report' ) {

            var reportFolderId = report && report.OwnerId && report.OwnerId.substring( 0, 15 );
            folderId = folderId && folderId.substring( 0, 15 );

            if ( folderId != reportFolderId ) {

                component.set( 'v.sourceReport', null );
                component.set( 'v.sourceReportId', null );
                component.set( 'v.sourceReportColumnName', null );
                component.set( 'v.record.sourceReportID', null );
                component.set( 'v.record.sourceReportColumnName', null );

            }

            helper.getReportsByFolderAsync( component, folderId )
                .then( $A.getCallback( function( reports ) {

                    component.set( 'v.sourceReports', reports );

                })).catch( $A.getCallback( function( error ) {

                    helper.toastMessage( 'Error Getting Reports By Folder', error, 'error' );

                }));

        }

    },

    handleSourceReportChange : function( component, event, helper ) {

        var sourceType = component.get( 'v.sourceType' );
        var reportId = component.get( 'v.sourceReportId' );

        if ( sourceType == 'Report' ) {

            if ( $A.util.isEmpty( reportId ) ) {

                component.set( 'v.sourceTypeURL', null );
                component.set( 'v.sourceReport', null );
                component.set( 'v.sourceReportColumns', null );
                component.set( 'v.sourceReportColumnName', null );
                component.set( 'v.record.sourceReportID', null );
                component.set( 'v.record.sourceReportColumnName', null );

            } else {

                helper.getReportAsync( component, reportId )
                    .then( $A.getCallback( function( report ) {

                        component.set( 'v.sourceTypeURL', '/one/one.app#/sObject/' + report.Id + '/view' );
                        component.set( 'v.sourceReport', report );
                        component.set( 'v.record.sourceReportID', ( report.Id && report.Id.substring( 0, 15 ) ) );

                    })).catch( $A.getCallback( function( error ) {

                        helper.toastMessage( 'Error Getting Report', error, 'error' );

                    }));

                helper.getReportColumnsAsync( component, reportId )
                    .then( $A.getCallback( function( reportColumns ) {

                        component.set( 'v.sourceReportColumns', reportColumns );

                        var columnName = component.get( 'v.sourceReportColumnName' );
                        var columnFound = false;

                        for ( var i = 0; i < reportColumns.length; i++ ) {

                            if ( reportColumns[i].value == columnName ) {
                                columnFound = true;
                                break;
                            }
                        }

                        if ( !columnFound ) {
                            component.set( 'v.sourceReportColumnName', null );
                            component.set( 'v.record.sourceReportColumnName', null );
                        } else {
                            component.set( 'v.record.sourceReportColumnName', columnName );
                        }

                    })).catch( $A.getCallback( function( error ) {

                        helper.toastMessage( 'Error Getting Report Columns', error, 'error' );

                    }));

            }

        }

    },

    // -----------------------------------------------------------------

    handleSourceListViewSobjectTypeChange : function( component, event, helper ) {

        var sourceType = component.get( 'v.sourceType' );
        var listView = component.get( 'v.sourceListView' );
        var sobjectType = component.get( 'v.sourceListViewSobjectType' );

        if ( sourceType == 'ListView' ) {

            if ( !$A.util.isUndefinedOrNull( listView ) && listView.SobjectType != sobjectType ) {

                component.set( 'v.sourceListViewID', null );
                component.set( 'v.record.sourceListViewID', null );

            }

            helper.getListViewsByObjectAsync( component, sobjectType )
                .then( $A.getCallback( function( listViews ) {

                    component.set( 'v.sourceListViews', listViews );

                })).catch( $A.getCallback( function( error ) {

                    helper.toastMessage( 'Error Getting List Views By Object', error, 'error' );

                }));

        }

    },

    handleSourceListViewChange : function( component, event, helper ) {

        var sourceType = component.get( 'v.sourceType' );
        var listViewId = component.get( 'v.sourceListViewId' );

        if ( sourceType == 'ListView' ) {

            if ( $A.util.isEmpty( listViewId ) ) {

                component.set( 'v.sourceTypeURL', null );
                component.set( 'v.sourceListView', null );
                component.set( 'v.record.sourceListViewID', null );

            } else {

                helper.getListViewAsync( component, listViewId )
                    .then( $A.getCallback( function( listView ) {

                        component.set( 'v.sourceTypeURL', '/one/one.app#/sObject/' + listView.SobjectType + '/list?filterName=' + listView.Id );
                        component.set( 'v.sourceListView', listView );
                        component.set( 'v.record.sourceListViewID', ( listView.Id && listView.Id.substring( 0, 15 ) ) );

                    })).catch( $A.getCallback( function( error ) {

                        helper.toastMessage( 'Error Getting List View', error, 'error' );

                    }));

            }

        }

    },

    // ----------------------------------------------------------------------------------

    handleTargetTypeChange : function( component, event, helper ) {

        var targetType = component.get( 'v.targetType' );
        var record = component.get( 'v.record' );

        // if true then we need to display prompt to user
        // to choose an object before we can show action options
        var targetTypeRequiresSobject = false;
        var targetTypeRequiresAction = false;

        if ( $A.util.isEmpty( targetType ) || targetType == 'Workflow' ) {

            targetTypeRequiresSobject = false;
            targetTypeRequiresAction = false;

            record.targetActionName = null;
            record.targetSobjectType = null;

        } else if ( targetType == 'Flow' ) {

            targetTypeRequiresSobject = false;
            targetTypeRequiresAction = true;

            //record.targetActionName = null;
            record.targetSobjectType = null;

        } else if ( targetType == 'QuickAction' ) {

            targetTypeRequiresSobject = true;
            targetTypeRequiresAction = true;

            //record.targetActionName = null;
            //record.targetSobjectType = null;

        } else if ( targetType == 'EmailAlert' ) {

            targetTypeRequiresSobject = true;
            targetTypeRequiresAction = true;

            //record.targetActionName = null;
            //record.targetSobjectType = null;

        } else if ( targetType == 'Apex' ) {

            targetTypeRequiresSobject = false;
            targetTypeRequiresAction = true;

            //record.targetActionName = null;
            record.targetSobjectType = null;

        }

        component.set( 'v.targetTypeRequiresSobject', targetTypeRequiresSobject );
        component.set( 'v.targetTypeRequiresAction', targetTypeRequiresAction );
        component.set( 'v.record', record );

        helper.renderTargetSobjectTypes( component );
        helper.renderTargetInvocableActions( component );

    },

    handleTargetSobjectTypeChange : function( component, event, helper ) {

        helper.renderTargetInvocableActions( component );

    },

    handleTargetTypeRequiresSobjectChange : function( component, event, helper ) {

        helper.renderTargetSobjectTypes( component );

    }

})
/*
BSD 3-Clause License

Copyright (c) 2018, Doug Ayers, douglascayers.com
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/