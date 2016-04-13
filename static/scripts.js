var persons = null;
var locations = null;
var tags = null;

 $(document).ready(function(){
    if (needs_persons()){
        get_persons();
    }

    if (needs_locations()){
        get_locations();
    }

    if (needs_tags()){
        get_tags();
    }

    if ($('#add_person_form').length){
        $("#add_person_form").submit(function(evt){
            evt.preventDefault();
            post_add_person_form();
        });
    }

    if ($('#add_location_form').length){
        $("#add_location_form").submit(function(evt){
            evt.preventDefault();
            post_add_location_form();
        });
    }

    if ($('#add_tag_form').length){
        $("#add_tag_form").submit(function(evt){
            evt.preventDefault();
            post_add_tag_form();
        });
    }

    if ($('#add_directory_form').length){
        $("#add_directory_form").submit(function(evt){
            evt.preventDefault();
            post_add_directory_form();
        });
    }

    if ($('#add_file_form').length){
        $("#add_file_form").submit(function(evt){
            evt.preventDefault();
            post_add_file_form();
        });
    }

    if ($('#browse_files_button').length){
        $("#browse_files_button").click(function(){
            browse_files();
        });
    }

    if ($('#browse_files_button').length){
        $("#browse_files_button").click(function(){
            browse_files();
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
            import_files();
        });
    }
});

function needs_persons(){
    return $('#personbuttons').length || $('#personstable').length;
}

function needs_locations(){
    return $('#locationbuttons').length || $('#locationstable').length;
}

function needs_tags(){
    return $('#tagbuttons').length || $('#tagstable').length;
}

function get_persons(){
    $.getJSON("/api/persons", function(result){
        persons = result['persons'];

        if ($('#personbuttons').length){
            for (var i=0, person; person = persons[i]; i++){
                var name = person['firstname'] + ' ' + person['lastname'];
                $("#personbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="person_' + person['id'] + '">' + name + '</label>');
            }
        }

        if ($('#personstable').length){
            $('#personstable tbody tr:not(:first)').remove();

            if (persons.length > 0){
                $("#no_person_message").hide();
                //$("#personstable").show();

                for (var i=0, person; person = persons[i]; i++){
                    var name = person['firstname'] + ' ' + person['lastname'];
                    var dateofbirth = person['dateofbirth'];
                    var age = null;
                    if (dateofbirth != null){
                        age = get_age(dateofbirth);
                    }
                    $("#personstable").append('<tr><td">' + person['firstname'] + '</td><td>' + person['lastname'] + '</td><td>' + get_printable_value(person['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(person['dateofbirth']) + '</td><td><a href="/person/' + person['id'] + '">Edit</a>, <a href="" class="delete_person_button" id="delete_person_' + person['id'] + '">Delete</a></td></tr>');
                }

                $(".delete_person_button").click(function(evt){
                    var id = $(this).attr('id').replace('delete_person_', '');
                    delete_person(id);
                    return false; // do not follow link
                });
            }
            else{
                $("#no_person_message").show();
                //$("#personstable").hide();
            }
        }
    });
}

function get_locations(){
    $.getJSON("/api/locations", function(result){
        locations = result['locations'];

        if ($('#locationbuttons').length){
            for (var i=0, location; location = locations[i]; i++){
                $("#locationbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="location_' + location['id'] + '">' + location['name'] + '</label>');
            }
        }

        if ($('#locationstable').length){
            $('#locationstable tbody tr:not(:first)').remove();

            if (locations.length > 0){
                $("#no_location_message").hide();
                //$("#locationstable").show();

                for (var i=0, location; location = locations[i]; i++){
                    $("#locationstable").append('<tr><td>' + location['name'] + '</td><td>' + get_printable_value(location['description']) + '</td><td><a href="/location/' + location['id'] + '">Edit</a>, <a href="" class="delete_location_button" id="delete_location_' + location['id'] + '">Delete</a></td></tr>');
                }

                $(".delete_location_button").click(function(){
                    var id = $(this).attr('id').replace('delete_location_', '');
                    delete_location(id);
                    return false; // do not follow link
                });
            }
            else{
                $("#no_location_message").show();
                //$("#locationstable").hide();
            }
        }
    });
}

function get_tags(){
    $.getJSON("/api/tags", function(result){
        tags = result['tags'];

        if ($('#tagbuttons').length){
            for (var i=0, tag; tag = tags[i]; i++){
                $("#tagbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="" id="tag_' + tag['id'] + '">' + tag['name'] + '</label>');
            }
        }

        if ($('#tagstable').length){
            $('#tagstable tbody tr:not(:first)').remove();

            if (tags.length > 0){
                $("#no_tag_message").hide();
                //$("#tagstable").show();

                for (var i=0, tag; tag = tags[i]; i++){
                    $("#tagstable").append('<tr><td>' + tag['name'] + '</td><td><a href="/tag/' + tag['id'] + '">Edit</a>, <a href="" class="delete_tag_button" id="delete_tag_' + tag['id'] + '">Delete</a></td></tr>');
                }

                $(".delete_tag_button").click(function(){
                    var id = $(this).attr('id').replace('delete_tag_', '');
                    delete_tag(id);
                    return false; // do not follow link
                });
            }
            else{
                $("#no_tag_message").show();
                //$("#tagstable").hide();
            }
        }
    });
}

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
            $("#filestable").append('<tr><td><a href="/api/filecontent/' + file['id'] + '">' + file['path'] + '</a></td><td>' + get_printable_value(file['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(datetime) + '</td><td>' + persons + '</td><td>' + locations + '</td><td>' + tags + '</td><td>Edit, <a href="" class="delete_file_button" id="delete_file_' + file['id'] + '">Delete</a></td></tr>');
        }

        $(".delete_file_button").click(function(){
            var id = $(this).attr('id').replace('delete_file_', '');
            delete_file(id);
            return false; // do not follow link
        });
    });
}

function browse_files(){
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

    $.getJSON(url, function(result){
        $("#files").empty();
        files = result['files'];
        for (var i=0, file; file = files[i]; i++){
            $("#files").append('<a href="/filecontent/' + file['id'] + '">' + file['path'] + '</a><br>');
        }
    });
}

function import_files(){
    if (window.confirm("This action may take several minutes. Continue?")){
        $("#import_result").text("Importing, please wait...");
        $.post("/api/import", function(json) {
            $("#import_result").text("");
            alert(json['message'] + "\n\nImported files: " + json['num_added_files'] + "\nNot imported files: " + json['num_not_added_files']);
        }, "json")
        .fail(function(){
            alert("Import failed");
        });
    }
}

function delete_file(id){
    $.ajax({
        url: '/api/file/' + id,
        type: 'DELETE',
        success: function(result){
            get_all_files();
        }
    })
    .fail(function(){
        alert('Delete file failed');
    });
}

function delete_person(id){
    $.ajax({
        url: '/api/person/' + id,
        type: 'DELETE',
        success: function(result){
            get_persons();
        }
    })
    .fail(function(){
        alert('Delete person failed');
    });
}

function delete_location(id){
    $.ajax({
        url: '/api/location/' + id,
        type: 'DELETE',
        success: function(result){
            get_locations();
        }
    })
    .fail(function(){
        alert('Delete location failed');
    });
}

function delete_tag(id){
    $.ajax({
        url: '/api/tag/' + id,
        type: 'DELETE',
        success: function(result){
            get_tags();
        }
    })
    .fail(function(){
        alert('Delete tag failed');
    });
}

function post_add_person_form(){
    $.post("/api/person", $("#add_person_form").serialize(), function(json){
        get_persons();
    }, "json")
    .fail(function(){
        alert("Add person failed");
    });
}

function post_add_location_form(){
    $.post("/api/location", $("#add_location_form").serialize(), function(json){
        get_locations();
    }, "json")
    .fail(function(){
        alert("Add location failed");
    });
}

function post_add_tag_form(){
    $.post("/api/tag", $("#add_tag_form").serialize(), function(json){
        get_tags();
    }, "json")
    .fail(function(){
        alert("Add tag failed");
    });
}

function post_add_directory_form(){
    $.post("/api/directory", $("#add_directory_form").serialize(), function(json){
        alert(json['message'] + "\n\nAdded files: " + json['num_added_files'] + "\nNot added files: " + json['num_not_added_files']);
        // TODO: get files for list?
    }, "json")
    .fail(function(){
        alert("Add directory failed");
    });
}

function post_add_file_form(){
    $.post("/api/file", $("#add_file_form").serialize(), function(json){
        alert(json['message']);
        // TODO: get files for list?
    }, "json")
    .fail(function(){
        alert("Add file failed");
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
