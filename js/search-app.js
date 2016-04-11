/**
 *  17.03.2016.
 */
var searchApp = angular.module('searchApp', ['elasticsearch']);
//{"detailed description":"Joomla! is a fully featured web content management system and was created in Summer 2005 as a fork from the hugely popular Mambo CMS with many of the original Mambo developers moving their efforts to Joomla! While still in its first release, it is supported by an active and well organized open source development team and community. Joomla! is both easy to use at the entry level for creating basic websites, whilst having the power and flexibility to support complex web applications. Joomla! implements the core requirements of a full-featured CMS. It has a powerful and extensible templating system with the ability to upload and manage many different data types. User access control, content approval, rich administrative control, and content display scheduling are all built-in. New features and extensions are constantly added to the core system, with many more being available and supported by the community","isbn":"1904811949","title":"Building Websites with Joomla! v1.0","price_gbp":34,"audience":"This book is suitable for web developers, designers, webmasters, content editors and marketing professionals who want develop a fully featured web presence in a simple and straightforward process. It does not require any detailed knowledge of programming or web development, and any IT confident individual will be able to use the book to produce an impressive web site.","authors":["Hagen Graf"],"subtitle":"NULL","topics":["Open Source","Content Management (CMS)","All Books","Joomla!","CMS and eCommerce"],"publication date":"2006-03-01"}

searchApp.service('searchService', function ($q, esFactory) {
    var esClient = esFactory({
        host: 'localhost:9200'
    });

    this.search = function (searchTerms, resultPage, selectedSort) {
        var deferred = $q.defer();

        var sortObject = {};
        sortObject[selectedSort.name] = selectedSort.direction;

        esClient.search({
            index: 'books',
            body: {
                query: {
                    match: {
                        _all: searchTerms
                    }
                },
                sort: [sortObject],
                from: resultPage * 10,
                aggs : {
                    topics : {
                        terms : {field : "topics"}
                    }
                }
            }
        }).then(function (es_return) {
            deferred.resolve(es_return);
        }, function (error) {
            deferred.reject(error);
        });
        return deferred.promise;
    };
    this.formatResults = function (documents) {
        var formattedResults = [];
        documents.forEach(function (document) {
            formattedResults.push(document._source);
            //  console.log(JSON.stringify(document._source));
        });

        return formattedResults;
    }

});

searchApp.controller('SearchResultList', function ($scope, searchService) {
    $scope.results = {
        searchTerms: null,
        documentCount: null,
        documents: []
    };

    $scope.searchTerms = null;
    $scope.noResults = false;
    $scope.isSearching = false;
    $scope.resultsPage = 0;

    var getResults = function () {
        $scope.isSearching = true;
        searchService.search(
            $scope.results.searchTerms,
            $scope.resultsPage,
            $scope.selectedSort
        ).then(function (es_return) {
               // console.log(es_return);
                var totalHits = es_return.hits.total;
                //var e = new Date().getTime() + (5 * 1000); //5 seconds pause purpose of  test
                //while (new Date().getTime() <= e) {}
                if (totalHits > 0) {
                    $scope.results.documentCount = totalHits;
                    $scope.results.documents.push.apply($scope.results.documents, searchService.formatResults(es_return.hits.hits));
                 //   console.log($scope.results.documents);
                } else {
                    $scope.noResults = true;
                }
                $scope.isSearching = false;

            },
            function (error) {
                console.log("eror happened while query on books" + error.message);
                $scope.isSearching = false;
            }
        )
    };


    // Sort
    $scope.sortOptions = [
        {name: '_score', displayName: 'Relevancy', direction: 'desc'},
        {name: 'price_gbp', displayName: 'Price', direction: 'asc'}
    ];

    $scope.selectedSort = $scope.sortOptions[0];

    $scope.updateSort = function () {
        resetResults();
        getResults();
    };

    $scope.$watchGroup(['results', 'noResults', 'isSearching'], function () {
        var documentCount = $scope.results.documentCount;
        if (!documentCount || documentCount <= $scope.results.documents.length || $scope.noResults || $scope.isSearching) {
            $scope.canGetNextPage = false;
        } else {
            $scope.canGetNextPage = true;
        }
    });

    var resetResults = function () {
        $scope.results.documents = [];
        $scope.results.documentCount = null;
        $scope.noResults = false;
        $scope.resultsPage = 0;
    };

    $scope.getNextPage = function () {
        $scope.resultsPage++;
        getResults();
    };

    $scope.search = function () {

        resetResults();

        var searchTerms = $scope.searchTerms;
        if (searchTerms) {
            $scope.results.searchTerms = searchTerms;
        } else {
            return;
        }
        getResults();
    }

});