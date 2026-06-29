<?php
/**
 * api/accounts.php
 *
 * Account Management API
 *
 * GET    -> List accounts
 * POST   -> Create account
 * PUT    -> Update account
 * DELETE -> Delete account
 */

require_once __DIR__ . '/config.php';

session_start();
requireAuth(); 
jsonHeaders();

$db = getDb();
$method = $_SERVER['REQUEST_METHOD'];

/*───────────────────────────────────────────────
  Helper
───────────────────────────────────────────────*/

function callerRole(): string
{
    return $_SESSION['role'] ?? 'client';
}

/*───────────────────────────────────────────────
  GET
───────────────────────────────────────────────*/

if ($method === 'GET') {

    if (callerRole() === 'admin') {

        $stmt = $db->query("
            SELECT
                id,
                first_name,
                middle_name,
                last_name,
                username,
                role,
                age,
                gender,
                department,
                created_at
            FROM users
            ORDER BY id ASC
        ");

    } else {

        $stmt = $db->prepare("
            SELECT
                id,
                first_name,
                middle_name,
                last_name,
                username,
                role,
                age,
                gender,
                department,
                created_at
            FROM users
            WHERE role='client'
            ORDER BY id ASC
        ");

        $stmt->execute();
    }

    $accounts = $stmt->fetchAll();

    foreach ($accounts as &$acc) {

        $acc['full_name'] = trim(
            $acc['first_name'] .
            ' ' .
            ($acc['middle_name'] ?? '') .
            ' ' .
            $acc['last_name']
        );
    }

    sendJson($accounts);
}

/*───────────────────────────────────────────────
  CREATE ACCOUNT
───────────────────────────────────────────────*/

if ($method === 'POST') {

    $data = jsonInput();

    $caller = callerRole();

    $firstName  = trim($data['first_name'] ?? '');
    $middleName = trim($data['middle_name'] ?? '');
    $lastName   = trim($data['last_name'] ?? '');

    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    $role = strtolower(trim($data['role'] ?? 'client'));

    $age        = !empty($data['age']) ? (int)$data['age'] : null;
    $gender     = $data['gender'] ?? null;
    $department = $data['department'] ?? null;

    if (
        $firstName === '' ||
        $lastName === '' ||
        $username === '' ||
        $password === ''
    ) {

        sendJson([
            'success'=>false,
            'message'=>'First name, last name, username and password are required.'
        ],400);
    }

    // Clients cannot create admins
    if ($caller !== 'admin' && $role === 'admin') {

        sendJson([
            'success'=>false,
            'message'=>'Clients can only create client accounts.'
        ],403);
    }

    if (!in_array($role,['admin','client'])) {
        $role='client';
    }

    // duplicate username

    $check = $db->prepare("
        SELECT id
        FROM users
        WHERE username=?
    ");

    $check->execute([$username]);

    if($check->fetch()){

        sendJson([
            'success'=>false,
            'message'=>'Username already exists.'
        ],409);
    }

    $passwordHash=password_hash($password,PASSWORD_BCRYPT);

    $insert=$db->prepare("
        INSERT INTO users
        (
            first_name,
            middle_name,
            last_name,
            username,
            password_hash,
            role,
            age,
            gender,
            department
        )
        VALUES
        (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        )
    ");

    $insert->execute([
        $firstName,
        $middleName,
        $lastName,
        $username,
        $passwordHash,
        $role,
        $age,
        $gender,
        $department
    ]);

    sendJson([
        'success'=>true,
        'id'=>$db->lastInsertId(),
        'role'=>$role
    ],201);
}

/*───────────────────────────────────────────────
  UPDATE ACCOUNT
───────────────────────────────────────────────*/

if ($method === 'PUT') {

    $id = (int)($_GET['id'] ?? 0);

    if (!$id) {
        sendJson([
            'success'=>false,
            'message'=>'Account ID is required.'
        ],400);
    }

    $data = jsonInput();

    $firstName  = trim($data['first_name'] ?? '');
    $middleName = trim($data['middle_name'] ?? '');
    $lastName   = trim($data['last_name'] ?? '');

    $username = trim($data['username'] ?? '');

    $age        = !empty($data['age']) ? (int)$data['age'] : null;
    $gender     = $data['gender'] ?? null;
    $department = $data['department'] ?? null;

    if ($firstName==='' || $lastName==='' || $username==='') {

        sendJson([
            'success'=>false,
            'message'=>'Required fields are missing.'
        ],400);
    }

    $find=$db->prepare("
        SELECT *
        FROM users
        WHERE id=?
    ");

    $find->execute([$id]);

    $user=$find->fetch();

    if(!$user){

        sendJson([
            'success'=>false,
            'message'=>'Account not found.'
        ],404);
    }

    $role=$user['role'];

    if(callerRole()==='admin' && !empty($data['role'])){

        if(in_array($data['role'],['admin','client'])){
            $role=$data['role'];
        }
    }

    $password=$data['password'] ?? '';

    if($password!=''){

        $hash=password_hash($password,PASSWORD_BCRYPT);

        $update=$db->prepare("
            UPDATE users
            SET
                first_name=?,
                middle_name=?,
                last_name=?,
                username=?,
                password_hash=?,
                role=?,
                age=?,
                gender=?,
                department=?
            WHERE id=?
        ");

        $update->execute([
            $firstName,
            $middleName,
            $lastName,
            $username,
            $hash,
            $role,
            $age,
            $gender,
            $department,
            $id
        ]);

    }else{

        $update=$db->prepare("
            UPDATE users
            SET
                first_name=?,
                middle_name=?,
                last_name=?,
                username=?,
                role=?,
                age=?,
                gender=?,
                department=?
            WHERE id=?
        ");

        $update->execute([
            $firstName,
            $middleName,
            $lastName,
            $username,
            $role,
            $age,
            $gender,
            $department,
            $id
        ]);
    }

    sendJson([
        'success'=>true
    ]);
}

/*───────────────────────────────────────────────
  DELETE ACCOUNT
───────────────────────────────────────────────*/

if($method==='DELETE'){

    if(callerRole()!=='admin'){

        sendJson([
            'success'=>false,
            'message'=>'Only administrators can delete accounts.'
        ],403);
    }

    $id=(int)($_GET['id'] ?? 0);

    if(!$id){

        sendJson([
            'success'=>false,
            'message'=>'Account ID is required.'
        ],400);
    }

    if((int)($_SESSION['user_id'] ?? 0)===$id){

        sendJson([
            'success'=>false,
            'message'=>'You cannot delete your own account.'
        ],400);
    }

    $delete=$db->prepare("
        DELETE FROM users
        WHERE id=?
    ");

    $delete->execute([$id]);

    sendJson([
        'success'=>true
    ]);
}

/*───────────────────────────────────────────────
  INVALID METHOD
───────────────────────────────────────────────*/

sendJson([
    'success'=>false,
    'message'=>'Method not allowed.'
],405);
