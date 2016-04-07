var persons = null;
var locations = null;
var tags = null;

 $(document).ready(function(){

    $.getJSON("/api/persons", function(result){
        persons = result['persons'];

        if ($('#personbuttons').length){
            for (var i=0, person; person = persons[i]; i++){
                var name = person['firstname'] + ' ' + person['lastname'];
                $("#personbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="person_' + person['id'] + '">' + name + '</label>');
            }
        }

        if ($('#personstable').length){
            for (var i=0, person; person = persons[i]; i++){
                var name = person['firstname'] + ' ' + person['lastname'];
                var dateofbirth = person['dateofbirth'];
                var age = null;
                if (dateofbirth != null){
                    age = get_age(dateofbirth);
                }
                $("#personstable").append('<tr><td>' + person['firstname'] + '</td><td>' + person['lastname'] + '</td><td>' + get_printable_value(person['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(person['dateofbirth']) + '</td><td><a href="/person/' + person['id'] + '">Edit</a></td></tr>');
            }
        }
    });

    $.getJSON("/api/locations", function(result){
        locations = result['locations'];

        if ($('#locationbuttons').length){
            for (var i=0, location; location = locations[i]; i++){
                $("#locationbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="location_' + location['id'] + '">' + location['name'] + '</label>');
            }
        }

        if ($('#locationstable').length){
            for (var i=0, location; location = locations[i]; i++){
                $("#locationstable").append('<tr><td>' + location['name'] + '</td><td><a href="/location/' + location['id'] + '">Edit</a></td></tr>');
            }
        }
    });

    $.getJSON("/api/tags", function(result){
        tags = result['tags'];

        if ($('#tagbuttons').length){
            for (var i=0, tag; tag = tags[i]; i++){
                $("#tagbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="tag_' + tag['id'] + '">' + tag['name'] + '</label>');
            }
        }

        if ($('#tagstable').length){
            for (var i=0, tag; tag = tags[i]; i++){
                $("#tagstable").append('<tr><td>' + tag['name'] + '</td><td><a href="/tag/' + tag['id'] + '">Edit</a></td></tr>');
            }
        }
    });

    if ($('#add_person_form').length){
        $("#add_person_form").submit(function(evt){
            evt.preventDefault();
            $.post("/api/person", $("#add_person_form").serialize(), function(json){
                // TODO: reload person table data
                // TODO: show error?
            }, "json");
        });
    }

    if ($('#add_location_form').length){
        $("#add_location_form").submit(function(evt){
            evt.preventDefault();
            $.post("/api/location", $("#add_location_form").serialize(), function(json){
                // TODO: reload location table data
                // TODO: show error?
            }, "json");
        });
    }

    if ($('#add_tag_form').length){
        $("#add_tag_form").submit(function(evt){
            evt.preventDefault();
            $.post("/api/tag", $("#add_tag_form").serialize(), function(json){
                // TODO: reload person table data
                // TODO: show error?
            }, "json");
        });
    }

    if ($('#browse_files_button').length){
        $("#browse_files_button").click(function(){
            // TODO: add selected persons, locations and tags to url
            var checked_persons = '';
            for (var i=0, person; person = persons[i]; i++){
                var id = 'person_' + person['id'];
                var checkbox = document.getElementById(id);
                if (checkbox != null && checkbox.checked){
                    checked_persons += person['id'] + ',';
                }
            }
            if (checked_persons != ""){
                checked_persons = checked_persons.slice(0, -1);
            }

            var checked_tags = '';
            for (var i=0, tag; tag = tags[i]; i++){
                var id = 'tag_' + tag['id'];
                var checkbox = document.getElementById(id);
                if (checkbox != null && checkbox.checked) {
                    checked_tags += tag['id'] + ',';
                }
            }
            if (checked_tags != ""){
                checked_tags = checked_tags.slice(0, -1);
            }

            var checked_locations = '';
            for (var i=0, location; location = locations[i]; i++){
                var id = 'location_' + location['id'];
                var checkbox = document.getElementById(id);
                if (checkbox != null && checkbox.checked) {
                    checked_locations += location['id'] + ',';
                }
            }
            if (checked_locations != ""){
                checked_locations = checked_locations.slice(0, -1);
            }

            var url = '/api/files?personids=' + checked_persons + '&locationids=' + checked_locations + '&tagids=' + checked_tags;
            //alert(url);

            $.getJSON(url, function(result){
                $("#files").empty();
                files = result['files'];
                for (var i=0, file; file = files[i]; i++){
                    $("#files").append('<a href="/filecontent/' + file['id'] + '">' + file['path'] + '</a><br>');
                }
            });
        });
    }

    // TODO: handle start slideshow button press

    if ($('#button_show_all_files').length){
        $("#button_show_all_files").click(function(){
            get_all_files();
        });
    }

    if ($('#import_button').length){
        $("#import_button").click(function(){
            if (window.confirm("This action may take several minutes. Continue?")){
                $("#import_result").text("Importing, please wait...");
                $.post("/api/import", function(json) {
                    $("#import_result").text("");
                    alert(json['message'] + "\n\nImported files: " + json['num_imported_files'] + "\nNot imported files: " + json['num_not_imported_files']);
                }, "json")
                .fail(function(){
                    alert("Import failed");
                });
            }
        });
    }
});

function get_all_files(){
    $.getJSON("/api/files", function(result){
        $("#filestable").empty();
        $("#filestable").append('<tr><th>Path</th><th>Description</th><th>Age</th><th>Date and Time</th><th>Persons</th><th>Locations</th><th>Tags</th><th>Actions</th></tr>');
        files = result['files'];
        for (var i=0, file; file = files[i]; i++){
            var datetime = file['datetime'];
            var age = null;
            if (datetime != null){
                age = get_age(datetime);
            }
            // TODO: create links to pages for person, location and tag
            var persons = file['persons'].toString();
            var locations = file['locations'].toString();
            var tags = file['tags'].toString();
            $("#filestable").append('<tr><td><a href="/api/filecontent/' + file['id'] + '">' + file['path'] + '</a></td><td>' + get_printable_value(file['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(datetime) + '</td><td>' + persons + '</td><td>' + locations + '</td><td>' + tags + '</td><td><a href="" id="delete_file_' + file['id'] + '">Delete</a></td></tr>');
        }
    });
}

function get_printable_value(value){
    if (value !== null && value !== ""){
        return value;
    }
    return 'N/A';
}

function get_age(dateString){
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())){
        age--;
    }
    return age;
}
