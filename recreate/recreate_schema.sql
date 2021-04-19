create table Snapshot (
    id integer primary key,
    fun_call_id integer,
    start_fun_call_id integer,
    line_no integer,

    constraint Snapshot_fk_fun_call_id foreign key (fun_call_id)
        references FunCall(id)
);

create table Value (
    id integer,
    type tinyint,
    version integer,
    value,
    
    constraint Value_pk primary key (id, version)
    constraint Value_fk_type_id foreign key (type)
        references Type(id)
);

create table Member (
    container integer,
    key integer,
    value integer,
    
    constraint Member_pk primary key (container, key)
    constraint Member_fk_container foreign key (container)
        references Value(id),
    constraint Member_fk_value foreign key (value)
        references Value(id)
);

create table Type (
    id tinyint primary key,
    name text
);

create table CodeFile (
    id integer primary key,
    file_path text,
    source text
);

create table FunCode (
    id integer primary key,
    name integer,
    code_file_id integer,
    line_no integer,
    local_varnames text,
    cell_varnames text,
    free_varnames text,

    constraint Fun_fk_code_fide_id foreign key (code_file_id)
        references CodeFile(id)
);

create table FunCall (
    id integer primary key,
    fun_code_id integer,
    locals integer, -- heap ID
    globals integer, -- heap ID
    cellvars text,
    freevars text,
    parent_id integer,
    
    constraint FunCall_fk_parent_id foreign key (parent_id)
        references FunCall(id)
    constraint FunCall_fk_fun_id foreign key (fun_code_id)
        references FunCode(id)
);

create table Error (
    id integer primary key,
    type text,
    message text,
    snapshot_id integer,

    constraint Error_fk_snapshot_id foreign key (snapshot_id)
        references Snapshot(id)
);