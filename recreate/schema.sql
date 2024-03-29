create table Snapshot (
    id integer primary key,
    fun_call_id integer,
    start_fun_call_id integer,
    line_no integer,

    constraint Snapshot_fk_fun_call_id foreign key (fun_call_id)
        references FunCall(id)
);

create index Snapshot_FunCallId_Idx on Snapshot (fun_call_id);

create table Value (
    id integer,
    type tinyint,
    version integer,
    value text,
    
    constraint Value_pk primary key (id, version)
    constraint Value_fk_type_id foreign key (type)
        references Type(id)
);

create table Member (
    container integer,
    key integer,
    key_type tinyint, -- 0: ref, 1: integer, 2: real
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
    name text,
    code_file_id integer,
    line_no integer,
    num_args integer, 
    local_varnames text,
    cell_varnames text,
    free_varnames text,

    constraint Fun_fk_code_fide_id foreign key (code_file_id)
        references CodeFile(id)
);

create index FunCode_fk_code_file_id_Idx on FunCode (code_file_id);

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

create index FunCall_fk_parent_id_Idx on FunCall (parent_id);
create index FunCall_fk_fun_code_id_Idx on FunCall (fun_code_id);

create table Error (
    id integer primary key,
    type integer,
    message text,
    snapshot_id integer,

    constraint Error_fk_snapshot_id foreign key (snapshot_id)
        references Snapshot(id)
);

create table PrintOutput (
    id integer primary key,
    snapshot_id integer,
    data text,

    constraint PrintOutput foreign key (snapshot_id)
        references Snapshot(id)
);